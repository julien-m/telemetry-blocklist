import {mkdir, rename, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {coverage, extractHosts, extractTurtle, indexRules, unique} from './core';
const root = resolve(import.meta.dir, '..');
const config = await Bun.file(`${root}/data/project.json`).json();
const curated = await Bun.file(`${root}/data/telemetry.json`).json();
const cache = `${root}/.cache`;
await mkdir(cache, {recursive: true});
const records: Record<string, object> = {};
async function download(id: string, url: string) {
  const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
  const text = await response.text();
  if (!text.trim() || /^\s*</.test(text)) throw new Error(`${id}: empty or HTML response`);
  const hash = new Bun.CryptoHasher('sha256').update(text).digest('hex');
  records[id] = {url, sha256: hash, bytes: Buffer.byteLength(text), fetchedAt: new Date().toISOString()};
  await writeFile(`${cache}/${id}.txt`, text);
  return text;
}
const [turtleRaw, live, published, ...baselines] = await Promise.all([
  download('turtlecute', config.turtleSource),
  download('turtlecute-live', config.turtleLiveBundle),
  download('turtlecute-published', config.turtleHostsSource),
  ...config.baselineSources.map(async (source: any) => {
    const text = await download(source.id, source.url);
    const index = indexRules(text, source.format);
    if (!index.global.size) throw new Error(`${source.id}: no recognized global rules`);
    return {id: source.id, index};
  })
]);
const turtle = JSON.parse(turtleRaw as string);
const domains = unique([...extractTurtle(turtle).map(r => r.domain), ...extractHosts(published as string), ...curated.map((r: any) => r.domain)]);
for (const {domain} of extractTurtle(turtle)) if (!(live as string).includes(domain)) throw new Error(`Live bundle mismatch: ${domain}`);
const matrix = Object.fromEntries(domains.map(d => [d, Object.fromEntries(baselines.map((source: any) => [source.id, coverage(d, source.index)]))]));
const lock = {generatedAt: new Date().toISOString(), sources: records, methodology: 'Conservative static domain-anchor inventory, not a browser or DNS engine simulation. Unresolved is not proof of absence. Conditional preprocessor sections are skipped.', recognizedGlobalRules: Object.fromEntries(baselines.map((s: any) => [s.id, s.index.global.size])), unsupportedRules: Object.fromEntries(baselines.map((s: any) => [s.id, s.index.unsupported]))};
await writeFile(`${root}/data/turtlecute-published.txt.tmp`, published as string);
// Stage every file only after all downloads and schema checks succeed.
for (const [name, value] of Object.entries({'turtlecute.json': turtle, 'coverage.json': matrix, 'sources-lock.json': lock})) {
  await writeFile(`${root}/data/${name}.tmp`, JSON.stringify(value, null, 2) + '\n');
}
for (const name of ['turtlecute-published.txt', 'turtlecute.json', 'coverage.json', 'sources-lock.json']) await rename(`${root}/data/${name}.tmp`, `${root}/data/${name}`);
console.log(`Refreshed ${domains.length} candidates against ${baselines.length} baseline sources. Review the diff before publishing.`);
