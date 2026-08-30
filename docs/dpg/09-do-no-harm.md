# 9 — Do no harm by design

> DPG Standard indicator 9, which has three parts. FormKrafter is a form
> library, so two of the three are not applicable — stated here explicitly
> rather than left blank.

## 9a — Data privacy and security

Covered in full by [7 — Privacy and applicable laws](07-privacy.md): no
telemetry, no storage, no identifiers, every outbound call replaceable and
integrator-directed. What follows is the security posture specific to *harm*.

**A spec is code, and is treated as one.** A form spec can carry rules. They are
not evaluated with `eval`: `SandboxJsRunnerService` interprets them in an AST
interpreter ([`packages/core/lib/services/sandbox_interpreter.ts`](../../packages/core/lib/services/sandbox_interpreter.ts))
that exposes no host scope, which also makes the library usable under a strict
Content Security Policy. `UnsafeEvalJsRunnerService` exists as an explicit
opt-in, named so that choosing it is deliberate.

The corollary is documented rather than hidden: **render only specs you trust**.
An untrusted spec is untrusted input, like any other document a system accepts.

**Validation cannot fail silently.** A validation rule that cannot be enforced —
a brick with rules but no `dataType`, or a schema that fails to compile — used to
be dropped without a sound, so a form could accept anything while reporting
itself valid. `validateFormData` now returns a `warnings` channel that says so,
and `lintSpec` catches the same problems before a spec is ever stored. This
matters for harm because a form that silently stops enforcing its rules looks
perfectly healthy from the outside.

**Client-side validation is never a guarantee.** The documentation states in
every relevant place that a submission acted upon must be revalidated on a
server. This is a security requirement, not a nicety.

**Accessibility as a harm question.** A public service form that a person cannot
complete excludes them from the service. The automated WCAG 2.1 AA gate and its
[report](../govstack/accessibility-report.md) exist for that reason, and its
limits are stated there.

**Vulnerability handling.** [SECURITY.md](../../SECURITY.md) defines a private
channel and names what is in scope, including sandbox escape and validation
bypass.

## 9b — Inappropriate and illegal content

**Not applicable.** FormKrafter hosts no content, publishes nothing and operates
no platform. It renders a form definition written by the application's own
authors, inside that application, for that application's users. There is no
feed, no upload gallery, no public surface and no discovery mechanism — nothing
a third party could use to distribute content to anyone.

Where an application uses FormKrafter to collect files, moderation of what is
collected is that application's responsibility, exactly as it would be with a
plain `<input type="file">`.

## 9c — Protection from harassment

**Not applicable.** FormKrafter has no accounts, no identities, no messaging, no
comments and no user-to-user interaction of any kind. Two people using an
application built with it cannot reach each other through it; there is nothing
to address, block or report to.

The one place where interpersonal conduct arises is the project's own community,
and it is governed by a [Code of Conduct](../../CODE_OF_CONDUCT.md) — Contributor
Covenant 2.1, with a named enforcement contact.

## Evidence

| Claim | Where |
|---|---|
| Rules run in an AST sandbox, not `eval` | [`sandbox_interpreter.ts`](../../packages/core/lib/services/sandbox_interpreter.ts) |
| Unenforceable validation surfaces as a warning | [`packages/core/__tests__/lint-spec.test.ts`](../../packages/core/__tests__/lint-spec.test.ts) |
| Specs can be linted before storage | [`packages/core/lib/utils/lint-spec.ts`](../../packages/core/lib/utils/lint-spec.ts) |
| WCAG 2.1 AA enforced on every commit | [accessibility report](../govstack/accessibility-report.md) |
| A private vulnerability channel exists | [SECURITY.md](../../SECURITY.md) |
| Community conduct is governed | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |
