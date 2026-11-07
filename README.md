# Achievement Studio

**A public step-by-step guide. Four GitHub workflows running on localhost.**

[Read the step-by-step guide](https://brunnojob.github.io/freebadges-contribution-/) · [GitHub achievement reference](https://docs.github.com/en/account-and-profile/reference/profile-reference)

The GitHub Pages site at https://brunnojob.github.io/freebadges-contribution-/ is a public PT-BR / English guide only. It contains no authentication form and makes no GitHub API calls. It is independent from devstart-lab.

The automation dashboard runs on your own computer at **http://localhost:4173**. Connect a classic personal access token from the account you want to use, select an owned repository, choose workflows, review the plan and execute. Pair Extraordinaire also needs a classic token from a different secondary account. Tokens stay in session memory and go directly to `api.github.com`. Internet access is required; localhost describes where the interface runs.

```sh
git clone https://github.com/brunnojob/freebadges-contribution-.git
cd freebadges-contribution-
npm start
```

Install Node.js 22+ first; no npm install is needed. Open http://localhost:4173 and keep the terminal open. On Windows, you can instead run `start-windows.cmd` after extracting the downloaded ZIP. Ctrl+C stops the server. If port 4173 is occupied, use `npm start -- --port 4174`.

## Automated workflows

| Workflow | What the app does |
| --- | --- |
| Quickdraw | Opens an issue, closes it immediately and checks the five-minute window. |
| Pull Shark | Creates and merges two pull requests with clearly labeled workflow records. |
| Pair Extraordinaire | Authenticates a second account, adds its GitHub no-reply co-author trailer to a commit and merges its PR. |
| YOLO | Merges a PR without review, optionally requesting an existing collaborator first. Stops if a review already exists. |

Combine workflows to reuse PRs. Selecting all four creates one issue and two PRs, with co-authorship and the unreviewed merge on the first PR. The only files created are labeled records under `.achievement-studio/`. Existing source is not rewritten. GitHub Desktop is optional: co-author trailers work through GitHub's API too.

**Completed workflow does not mean verified badge.** GitHub evaluates eligibility and issues achievements separately; the app has no achievement-award API and does not promise instant delivery. See your profile's Achievements page after execution. Quickdraw issue eligibility and other achievement criteria may change during GitHub's public preview.

## Use

1. Read the public guide, download or clone this repository and run `npm start`. Open **http://localhost:4173**. Paste tokens only in this local application.
2. Create a short-lived **classic PAT** with `public_repo` for public repositories, or `repo` for private repositories. No `admin`, `workflow`, or `delete_repo` scope is needed. Organization SSO can require separate authorization.
3. Authorize the session and select an initialized, owned, writable, non-fork repository. A dedicated repository is recommended.
4. Choose workflows. Pair requires a second token belonging to a different account; that token is cleared after the identity check. Use co-authorship with the account holder's agreement.
5. Review the repository and operations, then execute. Keep the tab open.
6. Inspect operation links and optionally export the JSON report. Reports exclude tokens. Disconnect clears account state.

Branch protections, required checks and repository rules are never bypassed. A blocked merge leaves its PR and branch available in the execution log. Stop takes effect between requests; a just-opened Quickdraw issue is still closed. Do not blindly repeat a partial run: inspect its report first. Reloading clears the session; reports are downloadable before leaving.

## Seven achievement guides and highlights

The studio documents Quickdraw, Pull Shark, Pair Extraordinaire, YOLO, Galaxy Brain, Starstruck and Public Sponsor. Only the first four have automation.

Starstruck progress uses the largest star count on a single owned, public, non-fork repository, with documented milestones of 16 / 128 / 512 / 4,096. It is an eligibility estimate, not a badge-award check. Stars are never summed or generated.

Galaxy Brain requires accepted, helpful Q&A answers in eligible Discussions. GitHub disabled achievements in `github.com/orgs/community`; see the [official announcement](https://github.com/orgs/community/discussions/106536). Public Sponsor requires GitHub Sponsors; external donations do not automatically qualify.

The highlights guide explains Pro, Developer Program Member, Security Bug Bounty Hunter, Campus Expert, Security advisory credit and GitHub Star. Historical achievements are identified separately. Program criteria and availability are controlled by GitHub; consult the linked official pages.

## Free Contributions included

[Free Contributions](https://github.com/brunnojob/free-contributions) is integrated in two forms:

- **Local browser app:** Preview a date range and generate labeled synthetic Git commits using the connected token. Limit: 1–20 commits/day and 1,500/run, with paced requests. Dates use UTC. Commits are retained on a separate history branch and fast-forwarded to the default branch only if it has not changed. No force push. A stopped or blocked run retains its history branch for inspection.
- **Original CLI:** Vendored unchanged in `vendor/free-contributions/` under its ISC license, including its date planner. Requires Node.js 22+ and Git; supports larger ranges and up to 1,000 commits/day.

```sh
node vendor/free-contributions/index.js --start 2024-01-01 --end 2024-12-31 --per-day 5
# Preview only. Apply in a separate clean Git repository with your identity configured:
node vendor/free-contributions/index.js --start 2024-01-01 --end 2024-12-31 --per-day 5 --repo ../my-history --apply --push
```

Synthetic activity is explicitly labeled. GitHub contribution eligibility depends on the account email, eligible branch and repository type. Private contributions require visibility settings. Processing may take up to 24 hours; exact green shades are not guaranteed. Repeating a run adds another batch.

## Local development

```sh
npm run dev
# http://localhost:4173
npm test
```

Node.js 22+; no package installation or build required. `npm start` and `npm run dev` serve `app/` on 127.0.0.1 only. The application rejects remote hostnames. GitHub Pages serves the guide in `docs/`, with a CSP that disables network connections. `npm run guide` previews the guide locally. Tests use mocked GitHub responses for mutation workflows and real temporary Git repositories for the vendored CLI. Automated tests do not verify actual badge awards.

## Existing history auditor

The original Python and Ruby Git collaboration auditors are retained:

```sh
python main.py . --limit 200
ruby audit.rb . --limit 200
ruby -Ilib test/git_audit_test.rb
python -m unittest discover -s cloud
```

The optional `cloud/sync.py` report archive is separate from the browser app; the app never invokes it. Existing proof artifacts describe the earlier audit implementation, not this studio's badge automation.

## License

Original code: [MIT](LICENSE). Vendored Free Contributions: [ISC](vendor/free-contributions/LICENSE). Maintained by [brunnodev.store](https://brunnodev.store).
