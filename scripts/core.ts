export const isDomain = (value: string): boolean => value.length <= 253 && value.includes('.') && value.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
export function validateDomain(value: string): string {
  if (!isDomain(value)) throw new Error(`Invalid domain: ${value}`);
  return value;
}
export const unique = (values: string[]) => [...new Set(values.map(validateDomain))].sort();
export const ancestors = (domain: string) => domain.split('.').slice(0, -1).map((_, i) => domain.split('.').slice(i).join('.'));
export type RuleIndex = {global: Map<string, string>; conditional: Map<string, string>; exceptions: Map<string, string>; unsupported: number};
export function indexRules(text: string, format: string): RuleIndex {
  const index: RuleIndex = {global: new Map(), conditional: new Map(), exceptions: new Map(), unsupported: 0};
  let nesting = 0;
  for (const raw of text.split(/\r?\n/)) {
    const rule = raw.trim();
    if (/^!#if\b/.test(rule)) { nesting++; continue; }
    if (/^!#endif\b/.test(rule)) { nesting = Math.max(0, nesting - 1); continue; }
    if (nesting || !rule || /^[!#\[]/.test(rule)) continue;
    if (format === 'suffix-domains' && isDomain(rule)) { index.global.set(rule, rule); continue; }
    const m = /^(\@\@)?\|\|([a-z0-9.-]+)\^(?:\$(.+))?$/.exec(rule);
    if (!m || !isDomain(m[2])) { index.unsupported++; continue; }
    const [, exception, domain, modifiers] = m;
    if (exception) index.exceptions.set(domain, rule);
    else if (!modifiers || modifiers.split(',').every(m => m === 'important' || m === 'all')) index.global.set(domain, rule);
    else index.conditional.set(domain, rule);
  }
  return index;
}
export function coverage(domain: string, index: RuleIndex) {
  const find = (map: Map<string, string>) => ancestors(domain).map(d => map.get(d)).find(Boolean);
  const exception = find(index.exceptions);
  const global = find(index.global);
  const conditional = find(index.conditional);
  return {status: exception ? 'exception-review' : global ? 'global' : conditional ? 'conditional' : 'unresolved', rule: exception || global || conditional || ''};
}
export function extractTurtle(data: Record<string, Record<string, string[]>>) {
  const rows: {domain: string; category: string; vendor: string}[] = [];
  for (const [category, vendors] of Object.entries(data)) {
    for (const [vendor, domains] of Object.entries(vendors)) {
      if (!Array.isArray(domains)) throw new Error('Unexpected Turtlecute data schema');
      for (const domain of domains) rows.push({domain: validateDomain(domain), category, vendor});
    }
  }
  if (!rows.length || new Set(rows.map(r => r.domain)).size !== rows.length) throw new Error('Empty or duplicate Turtlecute inventory');
  return rows;
}
export function render(domains: string[], format: string, title: string, description: string) {
  const ds = unique(domains);
  if (format === 'domains') return ds.join('\n') + '\n';
  if (format === 'hosts') return `# ${title}\n# ${description}\n# Exact hostnames only; no implicit subdomains.\n` + ds.map(d => `0.0.0.0 ${d}`).join('\n') + '\n';
  if (format === 'adblock') return `! Title: ${title}\n! Description: ${description}\n! License: CC BY-NC-SA 4.0\n! Expires: 1 day\n` + ds.map(d => `||${d}^`).join('\n') + '\n';
  throw new Error(`Unknown format: ${format}`);
}

export function extractHosts(text: string): string[] {
  const domains = text.split(/\r?\n/).filter(line => /^0\.0\.0\.0\s+/.test(line)).map(line => line.trim().split(/\s+/)[1]);
  if (!domains.length) throw new Error('Empty published hosts inventory');
  return unique(domains);
}
