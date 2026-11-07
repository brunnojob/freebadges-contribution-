import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { writeFileSync, realpathSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlan } from './docs/plan.js';

const help = `SponsorTest — contribution history playground

node index.js --start 2024-01-01 --end 2024-12-31 --per-day 5
node index.js --start 2024-01-01 --end 2024-12-31 --per-day 5 --repo ../my-history --apply

--start     First date, inclusive (YYYY-MM-DD, UTC)
--end       Last date, inclusive; today or earlier
--per-day   Commits per day, 1–1000 (default: 5)
--repo      Separate local Git repository you own
--apply     Create generated-history commits locally
--push      Also push the current branch to origin (requires --apply)
--help      Show this help

Without --apply, only a preview is printed. No login, token or network request.
Generated commits are labeled as synthetic history.`;

try {
  const { values } = parseArgs({ options: {
    start: { type: 'string' }, end: { type: 'string' },
    'per-day': { type: 'string', default: '5' }, repo: { type: 'string' },
    apply: { type: 'boolean' }, push: { type: 'boolean' }, help: { type: 'boolean' }
  }});
  if (values.help) { console.log(help); process.exit(0); }
  if (values.push && !values.apply) throw new Error('--push requires --apply.');
  const plan = createPlan({ start: values.start, end: values.end, perDay: values['per-day'] });
  console.log(`${plan.start} → ${plan.end} (UTC)\n${plan.dayCount} days × ${plan.perDay} commits = ${plan.total} generated commits`);
  if (!values.apply) { console.log('Preview only. Add --repo <path> --apply to create local commits.'); process.exit(0); }
  if (!values.repo) throw new Error('--repo is required with --apply.');
  const repo = realpathSync(resolve(values.repo));
  const git = (args, env = process.env) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env }).trim();
  if (realpathSync(git(['rev-parse', '--show-toplevel'])) !== repo) throw new Error('--repo must point to a Git repository root.');
  if (repo === realpathSync(dirname(fileURLToPath(import.meta.url)))) throw new Error('Use a separate repository for generated history.');
  if (git(['status', '--porcelain', '--untracked-files=all'])) throw new Error('Target repository must have a clean working tree.');
  git(['symbolic-ref', '--short', 'HEAD']);
  git(['var', 'GIT_AUTHOR_IDENT']);
  git(['var', 'GIT_COMMITTER_IDENT']);
  if (values.push) git(['remote', 'get-url', 'origin']);
  const run = new Date().toISOString();
  for (const day of plan.days) {
    for (let index = 1; index <= day.count; index++) {
      const date = `${day.date}T12:00:${String((index - 1) % 60).padStart(2, '0')}Z`;
      writeFileSync(resolve(repo, 'sponsortest-history.json'), JSON.stringify({ generated: true, tool: 'SponsorTest', run, date, index }, null, 2) + '\n');
      git(['add', '--', 'sponsortest-history.json']);
      git(['-c', 'commit.gpgsign=false', 'commit', '-m', `chore: generated history ${day.date} ${index}/${day.count}`, '--only', '--', 'sponsortest-history.json'], { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
    }
  }
  console.log(`Created ${plan.total} local commits. Repeating this command adds another batch.`);
  if (values.push) { git(['push', '--set-upstream', 'origin', 'HEAD']); console.log('Pushed to origin.'); }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
