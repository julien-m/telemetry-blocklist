import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {extractHosts, extractTurtle, render, unique} from './core';
const root = resolve(import.meta.dir, '..');
const config = await Bun.file(`${root}/data/project.json`).json();
const turtle = extractTurtle(await Bun.file(`${root}/data/turtlecute.json`).json());
const published = extractHosts(await Bun.file(`${root}/data/turtlecute-published.txt`).text());
const telemetry = await Bun.file(`${root}/data/telemetry.json`).json();
const matrix = await Bun.file(`${root}/data/coverage.json`).json();
const lock = await Bun.file(`${root}/data/sources-lock.json`).json();
const complete = unique([...turtle.map(r => r.domain), ...published, ...telemetry.filter((r: any) => r.profile === 'telemetry').map((r: any) => r.domain)]);
for (const domain of unique([...complete, ...telemetry.map((r: any) => r.domain)])) {
  for (const source of config.baselineSources) if (!matrix[domain]?.[source.id]) throw new Error(`Refresh required: missing coverage for ${domain} / ${source.id}`);
}
const profiles: Record<string, string[]> = {
  turtlecute: unique(turtle.map(r => r.domain)),
  'turtlecute-upstream': published,
  telemetry: unique(telemetry.filter((r: any) => r.profile === 'telemetry').map((r: any) => r.domain)),
  complete,
  'supplement-dns': complete.filter(d => !config.dnsBaselines.some((id: string) => matrix[d][id].status === 'global')),
  'supplement-browser': complete.filter(d => !config.browserBaselines.some((id: string) => ['global', 'conditional'].includes(matrix[d][id].status))),
  aggressive: unique([...complete, ...telemetry.map((r: any) => r.domain)])
};
const counts: Record<string, number> = {};
for (const [profile, description] of Object.entries(config.profiles)) {
  const domains = profiles[profile];
  if (!domains) throw new Error(`Unknown profile: ${profile}`);
  counts[profile] = domains.length;
  await mkdir(`${root}/lists/${profile}`, {recursive: true});
  for (const [format, filename] of Object.entries({domains: 'domains.txt', hosts: 'hosts.txt', adblock: 'adblock.txt'})) {
    await writeFile(`${root}/lists/${profile}/${filename}`, render(domains, format, `${config.title} - ${profile}`, description as string));
  }
}
const q = (value: unknown) => '"' + String(value).replaceAll('"', '""') + '"';
const sourceIds = config.baselineSources.map((s: any) => s.id);
const inventory = unique([...complete, ...telemetry.map((r: any) => r.domain)]);
const csv = [['domain', ...sourceIds].map(q).join(','), ...inventory.map(d => [d, ...sourceIds.map((id: string) => `${matrix[d][id].status}: ${matrix[d][id].rule}`)].map(q).join(','))].join('\n') + '\n';
await mkdir(`${root}/reports`, {recursive: true});
await writeFile(`${root}/reports/coverage.csv`, csv);
const evidence = ['# Domain evidence', '', 'Source snapshot: ' + lock.generatedAt + '. No local app inventory or browsing data is published.', '', '| Domain | Source | Role / caution |', '|---|---|---|', ...turtle.map(r => `| \`${r.domain}\` | [Turtlecute](${config.turtleSource}) | ${r.category} / ${r.vendor}. Test inventory, not independently proven telemetry-only. |`), ...published.filter(d => !turtle.some(r => r.domain === d)).map(d => `| \`${d}\` | [Published Turtlecute hosts](${config.turtleHostsSource}) | Present in published list; absent from the live test. Purpose not independently verified. |`), ...telemetry.map((r: any) => `| \`${r.domain}\` | [${r.vendor}](${r.source}) | ${r.role}. ${r.risk} |`)].join('\n') + '\n';
await writeFile(`${root}/reports/domain-evidence.md`, evidence);
const summary = {snapshot: lock.generatedAt, counts, turtlecuteByCategory: Object.fromEntries([...new Set(turtle.map(r => r.category))].map(c => [c, turtle.filter(r => r.category === c).length])), turtlecuteGlobalCoverage: Object.fromEntries(sourceIds.map((id: string) => [id, turtle.filter(r => matrix[r.domain][id].status === 'global').length]))};
await writeFile(`${root}/reports/summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
