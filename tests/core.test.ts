import {describe, expect, test} from 'bun:test';
import {ancestors, coverage, extractTurtle, indexRules, render, unique, validateDomain} from '../scripts/core';
describe('list safety and comparison', () => {
  test('matches domain boundaries and preserves unresolved state', () => {
    const index = indexRules('||collector.example^\n||flags.example^$third-party\n', 'adblock');
    expect(coverage('a.collector.example', index).status).toBe('global');
    expect(coverage('notcollector.example', index).status).toBe('unresolved');
    expect(coverage('flags.example', index).status).toBe('conditional');
    expect(ancestors('a.b.collector.example')).toContain('collector.example');
  });
  test('does not erase exception uncertainty or activate preprocessor branches', () => {
    const index = indexRules('||example.test^\n@@||special.example.test^$domain=site.test\n!#if env_test\n||hidden.test^\n!#endif\n', 'adblock');
    expect(coverage('special.example.test', index).status).toBe('exception-review');
    expect(coverage('hidden.test', index).status).toBe('unresolved');
  });
  test('rejects malformed domains and duplicate upstream entries', () => {
    for (const d of ['*.example.test', 'https://example.test', 'example.test/path', '-bad.test', 'UPPER.test']) expect(() => validateDomain(d)).toThrow();
    expect(() => extractTurtle({Ads: {Vendor: ['a.test', 'a.test']}})).toThrow();
    expect(() => extractTurtle({})).toThrow();
  });
  test('sorts, deduplicates, and exports exact hosts versus suffix rules', () => {
    const ds = ['b.test', 'a.test', 'b.test'];
    const expected = unique(ds);
    expect(render(ds, 'domains', '', '').trim().split('\n')).toEqual(expected);
    for (const d of expected) {
      expect(render(ds, 'hosts', '', '')).toContain(`0.0.0.0 ${d}\n`);
      expect(render(ds, 'adblock', '', '')).toContain(`||${d}^\n`);
    }
  });
  test('all generated profiles retain their declared inventory', async () => {
    const root = new URL('../', import.meta.url).pathname;
    const summary = await Bun.file(`${root}reports/summary.json`).json();
    const turtle = extractTurtle(await Bun.file(`${root}data/turtlecute.json`).json());
    for (const [profile, count] of Object.entries(summary.counts)) {
      const values = (await Bun.file(`${root}lists/${profile}/domains.txt`).text()).trim().split('\n');
      expect(values.length).toBe(count as number);
      expect(values).toEqual(unique(values));
      const adblock = await Bun.file(`${root}lists/${profile}/adblock.txt`).text();
      expect(adblock.split('\n').filter(x => x.startsWith('||')).length).toBe(values.length);
    }
    const full = (await Bun.file(`${root}lists/complete/domains.txt`).text()).trim().split('\n');
    for (const {domain} of turtle) expect(full).toContain(domain);
  });
});
