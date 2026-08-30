# 3 — Clear ownership

> DPG Standard indicator 3.

## Owner

**Streamline Pulse** holds the copyright and owns the project:

- Copyright line: `Copyright (c) 2026 Streamline Pulse` in
  [`LICENSE`](../../LICENSE).
- Repository: [`streamline-pulse/formkrafter`](https://github.com/streamline-pulse/formkrafter),
  under the organisation's own GitHub account.
- npm scope: `@streamline-pulse`, which the organisation controls; the five
  published packages all live under it.
- Documentation domain: `formkrafter.com`, served from this repository
  ([`docs/public/CNAME`](../../docs/public/CNAME)).
- Public contact: <contact@streamline-pulse.com>, the address published on the
  organisation's site.

## How the project is governed

The [Governance section of the README](../../README.md#governance) is the
normative statement. In short:

- The Streamline Pulse maintainers review and merge every change; there is no
  separate committer tier today.
- Decisions happen in the open on the repository — issues for defects and
  proposals, pull requests for the change itself. Nothing ships through a
  private channel.
- Any change that alters public behaviour carries a
  [changeset](../../.changeset) whose text becomes the published changelog
  entry, so the reason for a change is recorded where a consumer will find it.
- Releases are automated from `main`
  ([`release.yml`](../../.github/workflows/release.yml)): one release pull
  request per batch, all five packages versioned together, published from CI.

## How to take part

[`CONTRIBUTING.md`](../../CONTRIBUTING.md) covers setup, the checks a change
must pass and how to propose one. Participation is governed by
[`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) (Contributor Covenant 2.1) and
vulnerabilities by [`SECURITY.md`](../../SECURITY.md).

## What ownership does not restrict

The MIT licence grants the right to use, modify, redistribute and fork without
asking and without fee, including commercially and including by a public
administration that needs to run its own deployment. Ownership here means
stewardship of the canonical repository and the published packages — not control
over anyone's use of the software.
