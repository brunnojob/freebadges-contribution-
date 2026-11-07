# Freebadges Contribution launch kit

These are prepared drafts, not published posts. Use one destination-appropriate draft, a real screenshot and one link. Read the destination's current rules before posting. Do not mass-post the same text or promise instant badges.

## One-line pitch

Run GitHub achievement workflows and generate labeled contribution history from your browser, with execution in your own GitHub Actions account.

## StarSwap repository pitch

Four GitHub achievement workflows, seven guides and a contribution calendar in one PT-BR / English dashboard. Runs in your browser or your own private Actions executor.

## Reddit / SideProject

Title: I built a browser dashboard for GitHub achievement workflows and contribution history

I wanted the steps behind GitHub achievements to be visible and repeatable, so I built Freebadges Contribution.

It has four selectable workflows, guides for seven achievements, live Starstruck milestone estimates and a contribution calendar. You connect a classic PAT, choose a repository you own and inspect the execution plan. It can run from the browser or prepare a private Actions executor in your own account.

The interface supports English and PT-BR. Generated history is labeled as synthetic, and completed workflows are kept separate from GitHub-issued badges.

Source, live app and setup guide: https://github.com/brunnojob/freebadges-contribution-

I'd like feedback on the setup flow and permission explanations. What feels unclear?

## LinkedIn

I built Freebadges Contribution: a browser dashboard for GitHub achievement workflows and contribution history.

It combines four selectable workflows, guides for seven achievements, a contribution calendar and PT-BR / English support. Background execution uses a private GitHub Actions repository in the connected user's account.

One distinction is explicit in the UI: an executed workflow confirms GitHub operations, while GitHub evaluates badge eligibility separately.

Try the app and inspect the source: https://github.com/brunnojob/freebadges-contribution-

Feedback on the onboarding flow is welcome.

#GitHub #OpenSource #JavaScript #GitHubActions

## Show HN

Title: Show HN: A browser dashboard for GitHub achievement workflows and contribution history

Freebadges Contribution makes the underlying GitHub operations visible before execution. It supports four workflows, seven achievement guides, Starstruck progress estimates and explicitly labeled synthetic history.

The app is static GitHub Pages. A user can execute from the browser or use an Actions executor created privately in their own account. Tokens are not sent to the site's repository; runner secrets are sealed-box encrypted before upload to GitHub.

This uses classic-token authentication rather than OAuth. The tradeoff is a static deployment with no central credential backend, with broader PAT setup requirements that the app explains before execution.

Source and live app: https://github.com/brunnojob/freebadges-contribution-

## 30-second demo outline

- 0–5s: show the live dashboard and one-line problem statement.
- 5–12s: show the seven guides and four automated workflows. Use a clearly identified demo account; hide credentials.
- 12–20s: explain repository selection and review-plan behavior, with a sanitized recording if available. Do not present an unexecuted plan as a successful run.
- 20–26s: show the contribution-calendar preview and the synthetic-history label.
- 26–30s: show the source URL and ask for setup feedback.

## After launch

Answer reports, reproduce failures and ship changes with release notes. Track post URL, date, feedback and aggregate star/fork changes in a small log. Correlation is not proof that a particular post caused a star. Do not automate reciprocal stars or use secondary accounts to inflate metrics.
