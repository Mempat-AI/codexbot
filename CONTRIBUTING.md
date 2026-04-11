# Contributing

Thanks for contributing to Codex Anywhere.

## Development

Install dependencies:

```bash
npm install
```

Run the bot locally from source:

```bash
npm run connect
```

The repo supports two execution surfaces:
- source mode for local development: `npm run connect` and `npm run service:*`
- built mode for publishability checks: `node dist/cli.js ...` after `npm run build`

For macOS background-service work, verify the LaunchAgent commands from the repo:

```bash
npm run service:status
npm run service:install
npm run service:stop
npm run service:uninstall
```

Run checks before opening a PR:

```bash
npm test
npm run typecheck
npm run build
```

When a change affects CLI packaging, install flow, or service startup, also verify:

```bash
node dist/cli.js help
npm pack --dry-run
```

For startup or routing changes, keep automated coverage inside the existing
`npm test` lane. Prefer deterministic mocked E2E tests that use real temp
config/state files with fake Telegram, Codex, and local `omx` boundaries over
new external-service CI jobs.

## Pull Requests

Use pull requests for all changes. Do not push directly to `main`.

PR titles must follow:

```text
type(scope): summary
```

Examples:

- `feat(handoff): add current-session indicator`
- `fix(telegram): keep typing indicator alive during long turns`
- `docs(readme): document image upload flow`

Allowed types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`
- `build`
- `perf`
- `revert`

## Merge Policy

- use pull requests only
- require CI to pass before merge
- squash merge to one commit
- avoid merge commits and rebase merges on `main`
- keep commit history clean by using the PR title as the squash commit title

## Best Practices

- keep Telegram UX concise and readable
- prefer high-level summaries over raw shell noise in chat
- preserve Codex semantics where possible; adapt only where Telegram UX requires it
- add tests for parser, formatter, and state-machine changes
- keep mocked E2E coverage local and deterministic: no real Telegram, network, or live Codex dependencies
- when testing restart/resume flows, assert the persisted JSON state on disk instead of relying on in-memory-only setup
- keep source-run and publishable-built execution paths working together; do not break one to fix the other
- keep changes reversible and easy to review
