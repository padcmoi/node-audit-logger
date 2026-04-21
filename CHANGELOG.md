# Changelog

## [Unreleased] - yyyy-mm-dd

- fix(registry): restore npm package visibility

## [1.0.1] - 2026-04-21

- Rename package/repo after an npm registry issue.

## [1.0.0] - 2026-04-20

- Refactor: move to per-instance architecture (`mode` + `logPath` + `archiveMode`) instead of one service with 3 fixed paths.
- Add `AuditLoggerService` instance modes: `request`, `security`, `debug`.
- Add `archiveMode` behavior (`daily` or `none`) with archive purge support.
- Add docs (`helpers`, `express`, `nestjs`) and a minimal Express POC.
- Add unit tests, lint config and npm publish workflow.

## [0.1.0] - 2026-04-20

- Initial public release.
