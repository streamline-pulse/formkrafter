/**
 * A regular expression matcher that runs in time linear in the input: `pattern` validations run on
 * submitted data, server-side too, and a backtracking engine lets a 30-character value hang the process
 * on a pattern as plain as `^([a-z]+\s?)*$`.
 *
 * The pattern keeps JavaScript's syntax and meaning (`u` flag): the native engine checks the syntax and
 * decides what each single character matches (classes, `\p{…}`, escapes), while the structure
 * (sequence, alternation, repetition, anchors, lookahead) runs as a Thompson NFA, all states in step.
 * Backreferences and lookbehind have no such form and are refused, like an invalid pattern.
 */

export class UnsupportedPatternError extends SyntaxError {}

type Node =
    | { kind: "char"; test: (cp: number) => boolean }
    | { kind: "seq"; items: Node[] }
    | { kind: "alt"; alts: Node[] }
    | { kind: "repeat"; min: number; max: number; node: Node }
    | { kind: "assert"; at: "start" | "end" | "word" | "notWord" }
    | { kind: "look"; negate: boolean; node: Node };

type Inst =
    | { op: "char"; test: (cp: number) => boolean }
    | { op: "split"; x: number; y: number }
    | { op: "jmp"; x: number }
    | { op: "assert"; at: "start" | "end" | "word" | "notWord" }
    | { op: "look"; start: number; negate: boolean; slot: number }
    | { op: "match" };

/** Instructions a pattern may compile to: `(a{100}){100}` would otherwise expand without bound. */
export const MAX_PATTERN_PROGRAM = 10_000;
/** Steps all the lookaheads of one `test` may take; past it the value does not match. */
const LOOKAHEAD_BUDGET = 1_000_000;

const nativeTester = (source: string): ((cp: number) => boolean) => {
    const re = new RegExp(`^(?:${source})$`, "u");
    return (cp) => re.test(String.fromCodePoint(cp));
};

const isWordChar = (cp: number | undefined): boolean =>
    cp !== undefined &&
    ((cp >= 48 && cp <= 57) || (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122) || cp === 95);

const LINE_TERMINATORS = new Set([0x0a, 0x0d, 0x2028, 0x2029]);

const isHexLead = (text: string): boolean => /^[dD][89abAB]/.test(text);

const parse = (pattern: string): Node => {
    let i = 0;

    const unsupported = (what: string) =>
        new UnsupportedPatternError(`Invalid regular expression: /${pattern}/: ${what} is not supported`);

    const escapeEnd = (start: number): number => {
        const next = pattern[start + 1];
        if (next === "p" || next === "P" || (next === "u" && pattern[start + 2] === "{")) {
            return pattern.indexOf("}", start) + 1;
        }
        if (next === "u") {
            const end = start + 6;
            if (isHexLead(pattern.slice(start + 2, end)) && pattern.startsWith("\\u", end)) {
                const trail = pattern.slice(end + 2, end + 6);
                if (/^[dD][c-fC-F]/.test(trail)) return end + 6;
            }
            return end;
        }
        if (next === "x") return start + 4;
        if (next === "c") return start + 3;
        return start + 2;
    };

    const parseAtom = (): Node => {
        const c = pattern[i];
        if (c === "(") {
            if (pattern.startsWith("(?:", i)) {
                i += 3;
            } else if (pattern.startsWith("(?=", i) || pattern.startsWith("(?!", i)) {
                const negate = pattern[i + 2] === "!";
                i += 3;
                const node = parseAlt();
                i++;
                return { kind: "look", negate, node };
            } else if (pattern.startsWith("(?<=", i) || pattern.startsWith("(?<!", i)) {
                throw unsupported("lookbehind");
            } else if (pattern.startsWith("(?<", i)) {
                i = pattern.indexOf(">", i) + 1;
            } else if (pattern.startsWith("(?", i)) {
                throw unsupported("this group");
            } else {
                i += 1;
            }
            const node = parseAlt();
            i++;
            return node;
        }
        if (c === "[") {
            let j = i + 1;
            if (pattern[j] === "^") j++;
            while (pattern[j] !== "]") j += pattern[j] === "\\" ? 2 : 1;
            const source = pattern.slice(i, j + 1);
            i = j + 1;
            return { kind: "char", test: nativeTester(source) };
        }
        if (c === ".") {
            i++;
            return { kind: "char", test: (cp) => !LINE_TERMINATORS.has(cp) };
        }
        if (c === "^" || c === "$") {
            i++;
            return { kind: "assert", at: c === "^" ? "start" : "end" };
        }
        if (c === "\\") {
            const next = pattern[i + 1];
            if (next === "b" || next === "B") {
                i += 2;
                return { kind: "assert", at: next === "b" ? "word" : "notWord" };
            }
            if ((next >= "1" && next <= "9") || next === "k") throw unsupported("a backreference");
            const end = escapeEnd(i);
            const source = pattern.slice(i, end);
            i = end;
            return { kind: "char", test: nativeTester(source) };
        }
        const cp = pattern.codePointAt(i)!;
        i += cp > 0xffff ? 2 : 1;
        return { kind: "char", test: (other) => other === cp };
    };

    const parseQuantified = (atom: Node): Node => {
        let min: number;
        let max: number;
        const c = pattern[i];
        if (c === "*") [min, max] = [0, Infinity];
        else if (c === "+") [min, max] = [1, Infinity];
        else if (c === "?") [min, max] = [0, 1];
        else if (c === "{") {
            const match = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
            if (!match) return atom;
            min = Number(match[1]);
            max = match[2] === undefined ? min : match[3] ? Number(match[3]) : Infinity;
            i += match[0].length - 1;
        } else return atom;
        i++;
        if (pattern[i] === "?") i++;
        return { kind: "repeat", min, max, node: atom };
    };

    const parseSeq = (): Node => {
        const items: Node[] = [];
        while (i < pattern.length && pattern[i] !== "|" && pattern[i] !== ")") {
            items.push(parseQuantified(parseAtom()));
        }
        return { kind: "seq", items };
    };

    const parseAlt = (): Node => {
        const alts = [parseSeq()];
        while (pattern[i] === "|") {
            i++;
            alts.push(parseSeq());
        }
        return alts.length === 1 ? alts[0] : { kind: "alt", alts };
    };

    return parseAlt();
};

const compile = (root: Node, pattern: string): { program: Inst[]; slots: number } => {
    const program: Inst[] = [];
    const pendingLooks: { inst: Extract<Inst, { op: "look" }>; node: Node }[] = [];
    let slots = 0;

    const emit = (inst: Inst): number => {
        if (program.length >= MAX_PATTERN_PROGRAM) {
            throw new UnsupportedPatternError(`Invalid regular expression: /${pattern}/: pattern too large`);
        }
        program.push(inst);
        return program.length - 1;
    };

    const gen = (node: Node): void => {
        switch (node.kind) {
            case "char":
                emit({ op: "char", test: node.test });
                return;
            case "assert":
                emit({ op: "assert", at: node.at });
                return;
            case "look": {
                const inst: Extract<Inst, { op: "look" }> = { op: "look", start: -1, negate: node.negate, slot: slots++ };
                emit(inst);
                pendingLooks.push({ inst, node: node.node });
                return;
            }
            case "seq":
                for (const item of node.items) gen(item);
                return;
            case "alt": {
                const jumps: Extract<Inst, { op: "jmp" }>[] = [];
                node.alts.forEach((alt, index) => {
                    if (index === node.alts.length - 1) {
                        gen(alt);
                        return;
                    }
                    const split: Extract<Inst, { op: "split" }> = { op: "split", x: 0, y: 0 };
                    split.x = emit(split) + 1;
                    gen(alt);
                    const jump: Extract<Inst, { op: "jmp" }> = { op: "jmp", x: 0 };
                    emit(jump);
                    jumps.push(jump);
                    split.y = program.length;
                });
                for (const jump of jumps) jump.x = program.length;
                return;
            }
            case "repeat": {
                for (let n = 0; n < node.min; n++) gen(node.node);
                if (node.max === Infinity) {
                    const split: Extract<Inst, { op: "split" }> = { op: "split", x: 0, y: 0 };
                    const loop = emit(split);
                    split.x = loop + 1;
                    gen(node.node);
                    emit({ op: "jmp", x: loop });
                    split.y = program.length;
                    return;
                }
                const splits: Extract<Inst, { op: "split" }>[] = [];
                for (let n = node.min; n < node.max; n++) {
                    const split: Extract<Inst, { op: "split" }> = { op: "split", x: 0, y: 0 };
                    split.x = emit(split) + 1;
                    splits.push(split);
                    gen(node.node);
                }
                for (const split of splits) split.y = program.length;
                return;
            }
        }
    };

    gen(root);
    emit({ op: "match" });
    while (pendingLooks.length) {
        const { inst, node } = pendingLooks.shift()!;
        inst.start = program.length;
        gen(node);
        emit({ op: "match" });
    }
    return { program, slots };
};

class BudgetExceeded extends Error {}

const run = (program: Inst[], slots: number, input: string): boolean => {
    const text = Array.from(input, (char) => char.codePointAt(0)!);
    const n = text.length;
    const looks: (Uint8Array | undefined)[] = new Array(slots);
    let lookSteps = 0;

    const lookahead = (inst: Extract<Inst, { op: "look" }>, pos: number): boolean => {
        let memo = looks[inst.slot];
        if (!memo) memo = looks[inst.slot] = new Uint8Array(n + 1);
        if (!memo[pos]) memo[pos] = simulate(inst.start, pos, true) ? 1 : 2;
        return memo[pos] === 1;
    };

    // All threads in step from `from`: anchored for a lookahead, else a new thread starts at every position.
    const simulate = (start: number, from: number, anchored: boolean): boolean => {
        if (anchored) lookSteps += program.length;
        const seen = new Int32Array(program.length).fill(-1);
        let current: number[] = [];
        let next: number[] = [];

        const add = (list: number[], pc: number, pos: number): boolean => {
            const stack = [pc];
            while (stack.length) {
                const at = stack.pop()!;
                if (seen[at] === pos) continue;
                seen[at] = pos;
                const inst = program[at];
                switch (inst.op) {
                    case "match":
                        return true;
                    case "char":
                        list.push(at);
                        break;
                    case "jmp":
                        stack.push(inst.x);
                        break;
                    case "split":
                        stack.push(inst.y, inst.x);
                        break;
                    case "assert": {
                        const ok =
                            inst.at === "start" ? pos === 0
                                : inst.at === "end" ? pos === n
                                    : (isWordChar(text[pos - 1]) !== isWordChar(text[pos])) === (inst.at === "word");
                        if (ok) stack.push(at + 1);
                        break;
                    }
                    case "look":
                        if (lookahead(inst, pos) !== inst.negate) stack.push(at + 1);
                        break;
                }
            }
            return false;
        };

        for (let pos = from; ; pos++) {
            if ((!anchored || pos === from) && add(current, start, pos)) return true;
            if (pos === n || (anchored && current.length === 0)) return false;
            if (anchored) {
                lookSteps += current.length + 1;
                if (lookSteps > LOOKAHEAD_BUDGET) throw new BudgetExceeded();
            }
            const cp = text[pos];
            for (const pc of current) {
                const inst = program[pc] as Extract<Inst, { op: "char" }>;
                if (inst.test(cp) && add(next, pc + 1, pos + 1)) return true;
            }
            [current, next] = [next, current];
            next.length = 0;
        }
    };

    try {
        return simulate(0, 0, false);
    } catch (error) {
        if (error instanceof BudgetExceeded) return false;
        throw error;
    }
};

export interface LinearRegExp {
    test(input: string): boolean;
    toString(): string;
}

/** `new RegExp(pattern, flags).test` in linear time; throws `SyntaxError` on what `new RegExp` refuses, and on backreferences and lookbehind. */
export const linearRegExp = (pattern: string, flags = "u"): LinearRegExp => {
    if (flags !== "u") throw new SyntaxError(`linearRegExp supports the "u" flag only, got "${flags}"`);
    new RegExp(pattern, flags);
    const { program, slots } = compile(parse(pattern), pattern);
    return {
        test: (input) => run(program, slots, String(input)),
        toString: () => `/${pattern}/${flags}`,
    };
};

// Ajv's `code.regExp`; `code` only names it in standalone output, which the core does not generate.
linearRegExp.code = "linearRegExp";
