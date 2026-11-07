# Contributing

Help improve a browser application for GitHub workflows, achievement guides and contribution history. Small, focused changes are welcome.

## Get started

Use Node.js 22+ and Git. No npm dependency installation is required.

```sh
git clone https://github.com/brunnojob/freebadges-contribution-.git
cd freebadges-contribution-
npm run dev
```

Open the printed development URL. Use [good first issues](https://github.com/brunnojob/freebadges-contribution-/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22) to find bounded tasks. Comment on an issue before a larger implementation to avoid duplicate work.

## Project map

| Path | Purpose |
| --- | --- |
| `docs/js/app.js` | Browser UI and execution state |
| `docs/js/content.js` | PT-BR / English copy and achievement guides |
| `docs/js/github.js`, `workflows.js`, `actions.js` | API client, target workflows and private runner installation |
| `docs/guide/` | Public walkthrough |
| `scripts/actions-runner.mjs` | Background entry point |
| `scripts/build-runner.mjs` | Generates the packaged executor manifest |
| `test-web/` | Node tests, mocks and temporary Git repositories |

## Before opening a PR

1. Keep changes focused and describe the user-visible problem and result.
2. Run `npm test`. If runner sources changed, run `npm run build` and include `docs/js/runner-manifest.js`.
3. Check both languages and narrow layouts when changing UI.
4. Add a regression test for a bug when it protects meaningful behavior. Explain any verification limits.

Never commit tokens, account data or real credential screenshots. Use dummy identities and mocked GitHub responses in tests. Do not bypass repository rules, add automatic stars or claim that a completed workflow guarantees an achievement.

Browser-only authentication keeps tokens in session memory. Actions additionally saves encrypted credentials in the user's own private executor. Preserve this boundary and credential-free workflow inputs, reports and logs.

## Reports

Use the bug-report form for reproducible defects and the feature-request form for improvements. For a possible credential leak, avoid posting secrets in a public issue; see [SECURITY.md](SECURITY.md).

Contributions are licensed under the repository's MIT license. Vendored code keeps its original license.
