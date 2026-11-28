"""`pattern` validations in time linear in the input, as `validators/linear-regexp.ts` in the core.

`re` backtracks: a 30-character value can hang the server on a pattern as plain as `^([a-z]+\\s?)*$`. The
structure of the pattern (sequence, alternation, repetition, anchors, lookahead) runs here as a Thompson NFA,
all states in step; what a single character matches (classes, escapes) is left to `compile_pattern`, which
already gives them JavaScript's meaning. Backreferences and lookbehind have no such form and are refused.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

MAX_PATTERN_PROGRAM = 10_000
"""Instructions a pattern may compile to: `(a{100}){100}` would otherwise expand without bound."""
_LOOKAHEAD_BUDGET = 1_000_000

_LINE_TERMINATORS = frozenset("\n\r  ")
_COUNTED = re.compile(r"\{(\d+)(,(\d*))?\}")

CharTest = Callable[[str], bool]
Translate = Callable[[str], Any]


class UnsupportedPattern(ValueError):
    """A pattern construct with no linear-time form (backreference, lookbehind), or a pattern too large."""


@dataclass
class _Char:
    test: CharTest


@dataclass
class _Seq:
    items: list[Any]


@dataclass
class _Alt:
    alts: list[Any]


@dataclass
class _Repeat:
    min: int
    max: float
    node: Any


@dataclass
class _Assert:
    at: str  # start, end, word, not_word


@dataclass
class _Look:
    negate: bool
    node: Any


def _is_word(ch: str | None) -> bool:
    return ch is not None and (ch.isascii() and (ch.isalnum() or ch == "_"))


def _parse(pattern: str, translate: Translate) -> Any:
    i = 0

    def unsupported(what: str) -> UnsupportedPattern:
        return UnsupportedPattern(f"Invalid regular expression: /{pattern}/: {what} is not supported")

    def tester(source: str) -> CharTest:
        compiled = translate(source)
        return lambda ch: compiled.fullmatch(ch) is not None

    def escape_end(start: int) -> int:
        following = pattern[start + 1]
        if following in "pP" or pattern.startswith("u{", start + 1):
            return pattern.index("}", start) + 1
        return start + {"u": 6, "x": 4, "c": 3}.get(following, 2)

    def atom() -> Any:
        nonlocal i
        c = pattern[i]
        if c == "(":
            if pattern.startswith("(?:", i):
                i += 3
            elif pattern.startswith(("(?=", "(?!"), i):
                negate = pattern[i + 2] == "!"
                i += 3
                node = alternation()
                i += 1
                return _Look(negate, node)
            elif pattern.startswith(("(?<=", "(?<!"), i):
                raise unsupported("lookbehind")
            elif pattern.startswith("(?<", i):
                i = pattern.index(">", i) + 1
            elif pattern.startswith("(?", i):
                raise unsupported("this group")
            else:
                i += 1
            node = alternation()
            i += 1
            return node
        if c == "[":
            j = i + 1
            if pattern.startswith("^", j):
                j += 1
            while pattern[j] != "]":
                j += 2 if pattern[j] == "\\" else 1
            source = pattern[i : j + 1]
            i = j + 1
            return _Char(tester(source))
        if c == ".":
            i += 1
            return _Char(lambda ch: ch not in _LINE_TERMINATORS)
        if c in "^$":
            i += 1
            return _Assert("start" if c == "^" else "end")
        if c == "\\":
            following = pattern[i + 1]
            if following in "bB":
                i += 2
                return _Assert("word" if following == "b" else "not_word")
            if following in "123456789k":
                raise unsupported("a backreference")
            end = escape_end(i)
            source = pattern[i:end]
            i = end
            return _Char(tester(source))
        i += 1
        return _Char(c.__eq__)

    def quantified(node: Any) -> Any:
        nonlocal i
        c = pattern[i] if i < len(pattern) else ""
        if c == "*":
            low, high = 0, float("inf")
        elif c == "+":
            low, high = 1, float("inf")
        elif c == "?":
            low, high = 0, 1
        elif c == "{" and (counted := _COUNTED.match(pattern, i)):
            low = int(counted[1])
            high = low if counted[2] is None else (int(counted[3]) if counted[3] else float("inf"))
            i = counted.end() - 1
        else:
            return node
        i += 1
        if pattern.startswith("?", i):
            i += 1
        return _Repeat(low, high, node)

    def sequence() -> Any:
        items = []
        while i < len(pattern) and pattern[i] not in "|)":
            items.append(quantified(atom()))
        return _Seq(items)

    def alternation() -> Any:
        nonlocal i
        alts = [sequence()]
        while pattern.startswith("|", i):
            i += 1
            alts.append(sequence())
        return alts[0] if len(alts) == 1 else _Alt(alts)

    return alternation()


@dataclass
class _Inst:
    op: str  # char, split, jmp, assert, look, match
    test: CharTest | None = None
    x: int = 0
    y: int = 0
    at: str = ""
    negate: bool = False
    slot: int = 0


@dataclass
class _Program:
    insts: list[_Inst] = field(default_factory=list)
    slots: int = 0


def _compile(root: Any, pattern: str) -> _Program:
    program = _Program()
    insts = program.insts
    pending: list[tuple[_Inst, Any]] = []

    def emit(inst: _Inst) -> int:
        if len(insts) >= MAX_PATTERN_PROGRAM:
            raise UnsupportedPattern(f"Invalid regular expression: /{pattern}/: pattern too large")
        insts.append(inst)
        return len(insts) - 1

    def gen(node: Any) -> None:
        if isinstance(node, _Char):
            emit(_Inst("char", test=node.test))
        elif isinstance(node, _Assert):
            emit(_Inst("assert", at=node.at))
        elif isinstance(node, _Look):
            inst = _Inst("look", negate=node.negate, slot=program.slots)
            program.slots += 1
            emit(inst)
            pending.append((inst, node.node))
        elif isinstance(node, _Seq):
            for item in node.items:
                gen(item)
        elif isinstance(node, _Alt):
            jumps = []
            for alt in node.alts[:-1]:
                split = _Inst("split")
                split.x = emit(split) + 1
                gen(alt)
                jump = _Inst("jmp")
                emit(jump)
                jumps.append(jump)
                split.y = len(insts)
            gen(node.alts[-1])
            for jump in jumps:
                jump.x = len(insts)
        elif isinstance(node, _Repeat):
            for _ in range(node.min):
                gen(node.node)
            if node.max == float("inf"):
                split = _Inst("split")
                loop = emit(split)
                split.x = loop + 1
                gen(node.node)
                emit(_Inst("jmp", x=loop))
                split.y = len(insts)
                return
            splits = []
            for _ in range(int(node.max) - node.min):
                split = _Inst("split")
                split.x = emit(split) + 1
                splits.append(split)
                gen(node.node)
            for split in splits:
                split.y = len(insts)

    gen(root)
    emit(_Inst("match"))
    while pending:
        inst, node = pending.pop(0)
        inst.x = len(insts)
        gen(node)
        emit(_Inst("match"))
    return program


class _BudgetExceeded(Exception):
    pass


def _run(program: _Program, text: str) -> bool:
    insts = program.insts
    n = len(text)
    looks: list[dict[int, bool]] = [{} for _ in range(program.slots)]
    spent = 0

    def lookahead(inst: _Inst, pos: int) -> bool:
        memo = looks[inst.slot]
        if pos not in memo:
            memo[pos] = simulate(inst.x, pos, True)
        return memo[pos]

    def simulate(start: int, origin: int, anchored: bool) -> bool:
        nonlocal spent
        if anchored:
            spent += len(insts)
        seen = [-1] * len(insts)

        def add(threads: list[int], pc: int, pos: int) -> bool:
            stack = [pc]
            while stack:
                at = stack.pop()
                if seen[at] == pos:
                    continue
                seen[at] = pos
                inst = insts[at]
                op = inst.op
                if op == "match":
                    return True
                if op == "char":
                    threads.append(at)
                elif op == "jmp":
                    stack.append(inst.x)
                elif op == "split":
                    stack.append(inst.y)
                    stack.append(inst.x)
                elif op == "assert":
                    if inst.at == "start":
                        ok = pos == 0
                    elif inst.at == "end":
                        ok = pos == n
                    else:
                        before = text[pos - 1] if pos > 0 else None
                        after = text[pos] if pos < n else None
                        ok = (_is_word(before) != _is_word(after)) == (inst.at == "word")
                    if ok:
                        stack.append(at + 1)
                elif lookahead(inst, pos) != inst.negate:
                    stack.append(at + 1)
            return False

        current: list[int] = []
        pos = origin
        while True:
            if (not anchored or pos == origin) and add(current, start, pos):
                return True
            if pos == n or (anchored and not current):
                return False
            if anchored:
                spent += len(current) + 1
                if spent > _LOOKAHEAD_BUDGET:
                    raise _BudgetExceeded
            ch = text[pos]
            following: list[int] = []
            for pc in current:
                test = insts[pc].test
                assert test is not None
                if test(ch) and add(following, pc + 1, pos + 1):
                    return True
            current = following
            pos += 1

    try:
        return simulate(0, 0, False)
    except _BudgetExceeded:
        return False


class LinearPattern:
    """A compiled pattern: `search(value)` answers like `RegExp.prototype.test`, in linear time."""

    def __init__(self, pattern: str, translate: Translate) -> None:
        self.pattern = pattern
        self._program = _compile(_parse(pattern, translate), pattern)

    def search(self, value: str) -> bool:
        return _run(self._program, value)
