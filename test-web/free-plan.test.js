import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan } from '../vendor/free-contributions/docs/plan.js';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('inclusive intervals include leap day and multiple years', () => {
  const leap = createPlan({ start: '2024-01-01', end: '2024-12-31', perDay: 5 }, '2026-11-06');
  assert.equal(leap.dayCount, 366);
  assert.equal(leap.total, 1830);
  assert.ok(leap.days.some(day => day.date === '2024-02-29'));
  assert.equal(createPlan({ start: '2023-12-31', end: '2024-01-01', perDay: 1 }).dayCount, 2);
});
test('invalid, reversed and future dates and invalid counts fail', () => {
  for (const values of [
    { start: '2023-02-29', end: '2023-03-01' },
    { start: '2024-02-30', end: '2024-03-01' },
    { start: '2024-01-02', end: '2024-01-01' },
    { start: '2027-01-01', end: '2027-01-01' },
    { start: '1969-01-01', end: '1970-01-01' },
    ...[0, 1001, 1.5, 'abc'].map(perDay => ({ start: '2024-01-01', end: '2024-01-01', perDay }))
  ]) assert.throws(() => createPlan(values, '2026-11-06'));
});
test('CLI preview creates no commits; apply sets both dates and refuses dirty repos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sponsortest-'));
  const cli = resolve('vendor/free-contributions/index.js');
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
  const args = [cli, '--start', '2024-02-28', '--end', '2024-02-29', '--per-day', '2', '--repo', dir];
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Test Author');
    git('config', 'user.email', 'test@example.invalid');
    git('-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'initial');
    const before = git('rev-parse', 'HEAD');
    execFileSync(process.execPath, args);
    assert.equal(git('rev-parse', 'HEAD'), before);
    execFileSync(process.execPath, [...args, '--apply']);
    assert.equal(git('rev-list', '--count', 'HEAD'), '5');
    const dates = git('log', '-4', '--format=%aI %cI').split('\n');
    assert.equal(dates.filter(line => line.startsWith('2024-02-29')).length, 2);
    for (const line of dates) { const [author, committer] = line.split(' '); assert.equal(author, committer); }
    assert.match(git('log', '-1', '--format=%s'), /generated history/);
    writeFileSync(join(dir, 'untracked.txt'), 'do not stage');
    const result = spawnSync(process.execPath, [...args, '--apply'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /clean working tree/);
    assert.equal(git('rev-list', '--count', 'HEAD'), '5');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
