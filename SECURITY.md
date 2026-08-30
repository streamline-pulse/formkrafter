# Security policy

## Supported versions

FormKrafter is released as one fixed-version group: `formkrafter-core`, `-wc`,
`-react`, `-vue` and `-react-native` always share a version number. Only the
latest published version receives security fixes.

## Reporting a vulnerability

Report privately — do not open a public issue.

- **Preferred:** GitHub private vulnerability reporting, from the
  [Security tab](https://github.com/streamline-pulse/formkrafter/security) of
  this repository.
- **Alternative:** <contact@streamline-pulse.com>, with `FormKrafter security`
  in the subject.

Please include the affected version, a description of the impact, and the
smallest reproduction you can produce — a form spec and the data that triggers
it is usually enough.

We aim to acknowledge a report within five working days, and to publish a fix
and an advisory once one is available. We will credit you in the advisory unless
you ask otherwise.

## Scope

FormKrafter builds and renders forms; it stores nothing and calls no service of
its own. Reports we consider in scope:

- Escaping a rule sandbox — `runSandboxed` and `evalBrickCode` interpret rule
  code in an AST interpreter (`packages/core/lib/rules/`) rather than with
  `eval`; anything that reaches the host scope from a spec is a vulnerability.
- Cross-site scripting reachable from a form spec or from submitted data.
- A validation bypass where `validateFormData` reports a payload valid that the
  spec's rules reject.

Out of scope, because they are properties of the integrating application:

- Transport security, authentication and authorization of your own endpoints.
- Storage of submitted data. FormKrafter never persists anything.
- A spec authored by an untrusted party being given more privilege than the
  host intended: treat a spec as code, and only render specs you trust.

Server-side revalidation with `validateFormData` is required for any submission
you act on; the browser verdict is a user-experience affordance, never a
guarantee. See
[the validation guide](https://formkrafter.com/guides/validation/).
