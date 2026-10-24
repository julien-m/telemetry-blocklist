# Research scope and limitations

Snapshot: 2026-10-24. Read [the source URLs and hashes](../data/sources-lock.json), [each candidate's evidence](domain-evidence.md), and [the complete comparison](coverage.csv).

## Extraction

The canonical Turtlecute JSON contains 128 unique hostnames in six categories: Ads 20, Analytics 30, Error Trackers 6, Social Trackers 19, Mix 19, OEMs 34. Every hostname was found in the deployed JavaScript bundle. A private live DOM extraction also matched the same set exactly; machine-specific blocking results are not published. The published upstream hosts file contains 129 names: the 128 live-test domains plus `open.oneplus.net`. The `turtlecute-upstream` profile preserves that published list, and `complete` includes the extra name without claiming it was tested. The page's 132 total checks include four non-domain checks.

The test sends HEAD requests with `no-cors`; an opaque HTTP response counts as accessible. A rejected request is counted as blocked even when DNS, TLS or network failure may be responsible. Use actual firewall/filter logs to establish causality. The request probes do not demonstrate absence of all tracking.

The Amazon group has four names: `adtago.s3.amazonaws.com`, `analyticsengine.s3.amazonaws.com`, `analytics.s3.amazonaws.com`, `advice-ads.s3.amazonaws.com`. Preserve these exact names instead of blocking shared Amazon infrastructure. All four are covered by the current AdGuard DNS source in the supported static comparison.

## Comparison contract

| State | Meaning |
|---|---|
| `global` | A recognized unconditional `||domain^` suffix block, optionally `important`/`all`, or a HaGeZi suffix-domain entry; no recognized matching anchored exception |
| `conditional` | A domain-anchored rule with other options, such as `third-party`; not global native-app protection |
| `exception-review` | A matching anchored allow rule exists; no attempt to simulate context or precedence |
| `unresolved` | No supported domain anchor; can still match generic paths, regex or other unsupported rules |

All preprocessor branches are skipped conservatively. More complicated exceptions and URL/context semantics are not evaluated, even for `global` entries. Therefore all states describe static evidence, not effective runtime decisions. Hashes pin the observed source text; current raw source URLs can later change.

The matrix is finite and reproducible: it covers this repository's candidate domains against seven named snapshots. It cannot substantiate “unknown to AdGuard/uBO” across all filters or installations. uBO combines multiple default lists and can redirect requests; listing zero global matches in its Privacy add-on alone does not mean uBO provides zero protection.

## Existing work and recommendation

The Turtlecute project already publishes hosts and Adblock-format lists; maintaining an unexplained clone adds little. HaGeZi maintains native-tracker lists and a tiered combined list. Its Pro reference has recognized global matches for 126 of the 128 Turtlecute candidates at this snapshot. This says nothing about whether those two remaining domains are actually unblocked by a complete configured client.

The useful addition here is provenance, separate app-observability collectors, candid mixed-use classification, multi-format exports and source-specific candidate supplements. Keep an established general list, then add only the profile needed for the intended policy. A giant union tends to repeat existing coverage and increase false positives.

## Evidence versus validation

Verified: inventory extraction, deployed-bundle membership, live-DOM set equality, baseline source hashes, static rule classification, deterministic generation, syntax/domain validation, profile membership and tests.

Not verified: actual Little Snitch import on the target installation; connectivity after blocking in ChatGPT, Codex, Claude Desktop or other apps; total effective coverage in AdGuard/uBO; first-party proxy detection; every listed hostname's current DNS liveness or ownership. The lists have not been activated on the user's Mac.

Endpoint documentation identifies destination purposes, not the payload contents sent by a particular build. Server-side retention/training controls are a separate policy from client-side diagnostics blocking. Blocking telemetry does not establish that prompts are excluded from model training.

## Source entry points

- Read [Turtlecute's source](https://github.com/Turtlecute33/adblocktest) for inventory, test engine and inherited license.
- Read [HaGeZi's native tracker documentation](https://github.com/hagezi/dns-blocklists#native) before adding more OS-wide blocks.
- Read [Little Snitch's formats](https://help.obdev.at/littlesnitch6/concepts-blocklists) and [AdGuard's DNS syntax](https://adguard-dns.io/kb/general/dns-filtering-syntax/) to preserve suffix/exact-host semantics.
- Read [OpenAI's network recommendations](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps) and [Claude Code's current network documentation](https://code.claude.com/docs/en/network-config) before changing AI-app traffic.
- Read [Apple's enterprise network requirements](https://support.apple.com/en-us/101555) to avoid treating update, certificate or cloud service hosts as telemetry-only.
