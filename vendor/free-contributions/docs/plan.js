export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Use dates in YYYY-MM-DD format.');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date.');
  return date;
}

export function createPlan({ start, end, perDay = 5 }, today = new Date().toISOString().slice(0, 10)) {
  const first = parseDate(start);
  const last = parseDate(end);
  if (start < '1970-01-01') throw new Error('Start date must be 1970-01-01 or later.');
  if (first > last) throw new Error('Start date must be on or before end date.');
  if (end > today) throw new Error('Choose today or a past date.');
  const count = Number(perDay);
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Commits per day must be an integer from 1 to 1000.');
  const days = [];
  for (let time = first.getTime(); time <= last.getTime(); time += 86400000) {
    days.push({ date: new Date(time).toISOString().slice(0, 10), count });
  }
  return { start, end, perDay: count, dayCount: days.length, total: days.length * count, days };
}
