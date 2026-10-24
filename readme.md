# Mac Telemetry Blocklists

Small, auditable blocklists for Little Snitch, AdGuard and uBlock Origin. Includes the complete Turtlecute host-test inventory and documented telemetry collectors used by desktop software. This is a research-backed starting point, not an exhaustive tracker database or a claim of zero breakage.

## Choose a profile

Initial snapshot: 2026-10-24. Counts are domain entries, including some parent/child overlaps; not counts of unique tracking companies.

| Profile | Entries | Intended use |
|---|---:|---|
| `turtlecute` | 128 | Exact host-test inventory, including mixed-use hosts and vendor dashboards |
| `telemetry` | 26 | Documented event/crash collectors; global blocks affect every app using them |
| `turtlecute-upstream` | 129 | Published hosts list, including one hostname absent from the live test |
| `complete` | 153 | Published Turtlecute list plus telemetry collectors; includes the risks of every Turtlecute entry |
| `supplement-dns` | 44 | Candidate additions to the current AdGuard DNS filter |
| `supplement-browser` | 45 | Candidate additions after checking selected AdGuard/uBO ecosystem lists |
| `aggressive` | 160 | Complete plus mixed-use PostHog, Mixpanel and experimentation endpoints |

For the requested full Turtlecute coverage at the Mac firewall, choose `complete/domains.txt`. For a smaller diagnostics-focused start, choose `telemetry/domains.txt`. Use a supplement only alongside its documented baseline. Supplements do not replace a general-purpose blocklist.

The publication branch is `stable`.

## Subscription URLs

| Client | Full inventory | Candidate supplement |
|---|---|---|
| Little Snitch 6/7 | [complete domains](https://raw.githubusercontent.com/julien-m/mac-telemetry-blocklists/stable/lists/complete/domains.txt) | [DNS supplement domains](https://raw.githubusercontent.com/julien-m/mac-telemetry-blocklists/stable/lists/supplement-dns/domains.txt) |
| AdGuard Home / DNS filtering | [complete Adblock rules](https://raw.githubusercontent.com/julien-m/mac-telemetry-blocklists/stable/lists/complete/adblock.txt) | [DNS supplement rules](https://raw.githubusercontent.com/julien-m/mac-telemetry-blocklists/stable/lists/supplement-dns/adblock.txt) |
| AdGuard browser extension / uBlock Origin | [complete Adblock rules](https://raw.githubusercontent.com/julien-m/mac-telemetry-blocklists/stable/lists/complete/adblock.txt) | [browser supplement rules](https://raw.githubusercontent.com/julien-m/mac-telemetry-blocklists/stable/lists/supplement-browser/adblock.txt) |

Little Snitch: open Rules → Add Blocklists / + → enter the chosen raw URL. Its domains format blocks listed names and subdomains. See [Objective Development's format documentation](https://help.obdev.at/littlesnitch6/concepts-blocklists).

AdGuard Home: Filters → DNS blocklists → Add blocklist → custom list → paste the Adblock URL. AdGuard browser extension and uBO: add it under custom filter-list subscriptions. Product editions differ: the managed AdGuard DNS service does not necessarily accept arbitrary subscription URLs on every plan.

No installed firewall or browser settings are changed by this repository. Formats are generated and checked; import and app-function testing must be done on the target installation.

## Format semantics

- `domains.txt`: suffix blocks in Little Snitch. Plain-domain behavior differs in other products; AdGuard Home treats a bare domain as an exact name. Do not assume identical semantics.
- `adblock.txt`: `||domain^` blocks the domain and subdomains in supported Adblock/DNS clients. No scriptlets or cosmetic rules are included.
- `hosts.txt`: exact names only. Does not automatically cover Sentry tenant names or other subdomains. A fallback, not equivalent to suffix filtering.

A firewall/DNS list cannot hide ad placeholders or block only a URL path. Turtlecute's 128 domain probes and its four cosmetic/script checks are different tests. A connection failure can also reflect DNS/TLS/network problems; a green score alone is not evidence of a firewall decision.

## What the comparison proves

Read [the methodology](reports/methodology.md) and inspect [the domain-by-domain matrix](reports/coverage.csv), [domain evidence](reports/domain-evidence.md) and [source hashes](data/sources-lock.json).

Baselines: AdGuard DNS; AdGuard Base; AdGuard Tracking Protection; EasyList; EasyPrivacy; uBlock filters Privacy; HaGeZi Pro as a reference. This is not all uBO default lists, all AdGuard products, every language list or the user's enabled configuration.

The static analyzer recognizes unconditional domain-anchored blocks and simple conditional domain blocks, handles parent-domain coverage, flags matching anchored exceptions, and skips preprocessor branches. It does not implement either product's full engine. `unresolved` means no supported anchor found, not “unblocked” or “absent from every filter”. Generic paths, regular expressions, redirects, scriptlets, site restrictions and exception precedence need a real client evaluation.

The DNS supplement removes unconditional global domain matches in AdGuard DNS. The browser supplement removes both global and conditional anchored matches in the five selected browser baselines, so it deliberately avoids re-listing known conditional anchors. It cannot promise zero overlap with generic URL rules, or first-party protection from the baseline's third-party-only rules. Both supplements are candidate lists, not measured security gaps.

The Amazon test host `analyticsengine.s3.amazonaws.com` is already present as an unconditional block in both AdGuard DNS and AdGuard Tracking Protection at this snapshot. An observed failed test therefore needs configuration/log investigation before blaming upstream coverage.

## Scope and application cautions

- Sentry ingestion suffixes include tenant subdomains. Blocking all `sentry.io` would also interfere with developer dashboards; that root is deliberately excluded.
- Datadog intakes are shared across customers. The two endpoints documented for current Claude Code are included; this does not establish that every Claude Desktop version uses them.
- OpenAI's published allowlist names Sentry/RUM endpoints. This supports candidate classification, not proof that every ChatGPT/Codex build sends to each one. Keep inference, authentication, files and streaming destinations available.
- `aggressive` adds services that also deliver feature flags/configuration. A block may silently change behavior. `oaistatsig.com` is explicitly mixed-use; `prodregistryv2.org` is not assumed to be collection-only.
- Some Turtlecute entries are SDK assets, dashboards or mixed services (for example `app.bugsnag.com`, `careers.hotjar.com`, `grs.hicloud.com`). Inclusion preserves the test inventory, not a recommendation to block every entry indiscriminately.
- No broad `amazonaws.com`, `s3.amazonaws.com`, `cloudflare.com`, `cloudflare-dns.com`, `openai.com`, `chatgpt.com`, `anthropic.com`, `claude.ai` or `icloud.com` block is included.
- First-party proxies, CNAME cloaking, custom/self-hosted collectors and telemetry sent to the same origin as useful requests are not exhaustively covered. DNS liveness was not used to infer safety or tracking purpose.

Prefer native telemetry controls when possible. For Claude Code, consult [data usage](https://code.claude.com/docs/en/data-usage): broad telemetry/nonessential-traffic opt-outs can disable feature flags and affect Remote Control, while the error-reporting-only control is narrower. For VS Code, consult [telemetry controls](https://code.visualstudio.com/docs/configure/telemetry); extensions may have their own telemetry. No settings are changed here.

For app-scoped blocking, use Little Snitch rules limited to the relevant process; URL subscriptions apply across apps. If functionality regresses, disable the matching list entry and inspect recent connections. Do not disable certificate validation, updates or authentication to improve a test score.

## Maintain

Requires [Bun](https://bun.sh/), no third-party runtime packages.

```bash
bun run build
bun test
bun run refresh
bun run build
bun test
```

`build` is offline and deterministic from committed inputs. `refresh` downloads public upstream snapshots with bounded requests, checks that every upstream Turtlecute domain appears in the deployed bundle, and recomputes the matrix. Review data and generated diffs before publishing. Updates are manual: subscriptions fetch repository changes, but no unattended upstream publishing is configured.

Read [the endpoint records](data/telemetry.json) before adding a collector: each needs a primary source, role, risk and profile. Report false positives with the domain, affected app/version and minimal reproduction; never attach tokens, unredacted URLs or private traffic logs.

## Attribution and license

Turtlecute inventory: [Turtlecute33/adblocktest](https://github.com/Turtlecute33/adblocktest), based on d3ward's work, with its original contributors. The inventory is reorganized and combined with independently documented collector endpoints. The inherited CC BY-NC-SA 4.0 text is preserved in [license](license); this repository is offered under the same license. Consult each upstream project's own license for its full lists; those full lists are downloaded into an ignored cache and are not redistributed here. Comparison results identify source rules for auditability.
