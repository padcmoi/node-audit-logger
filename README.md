# @naskot/node-audit-logger

Node.js audit logger based on reusable instances.

- One instance = one `logPath` + one `mode` (`request`, `security`, `debug`)
- `archiveMode` per instance (`daily` or `none`)
- Request middleware compatible with Express signature
- Security and debug line writers
- Purge support for active logs + optional archive cleanup

## Install

```bash
npm i @naskot/node-audit-logger
```

## Official Documentation

- Express usage guide: [docs/express.md](./docs/express.md)
- NestJS usage guide: [docs/nestjs.md](./docs/nestjs.md)
- Core API reference: [docs/helpers.md](./docs/helpers.md)

## Local checks

```bash
npm run lint
npm run check
npm test
npm run build
```

## POC

A minimal Express proof exists in [`poc/`](./poc):

```bash
cd poc
pnpm install
pnpm dev
pnpm build
node dist/index.js
```
