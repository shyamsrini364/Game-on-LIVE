# Week 3 demo implementation and evidence

Ported the relevant I-065 visual workflow and existing graph/contracts into the existing public repository. The private application's deployment, database and source branch are not modified by this port.

Application allowlist: graph/contracts/policies/activity/scheduling/models, directory contracts/data, safe Playbypoint reference modules, frontend court/map/pricing/activity components and licensed public artwork/fonts. No database adapters, Neon client, auth keys, internal handoffs, analytics, raw logs, environment files or private Git history were imported. `gameon/storage.py` contains only exception types; `openai_provider.py` is a disabled interface. Demo-specific adapters live in `demo_runtime.py` and `web/demo.js`.

The generic existing `discover_courts` contract is used for the simulated inventory seam; no browser is launched and no provider endpoints are queried. A returns results on the first permitted slot. B returns empty on the first slot, results on the second; the unchanged policy offers the second slot only after the first observation. C returns empty twice. All observations carry simulated provenance. Real LangGraph execution, not a prerecorded response, creates the trace and output.

Approval reruns the stateless scenario and validates the exact court/slot/day with an explicit `approved: true`. It cannot make an external write. Reset and scenario changes increment a browser generation counter so in-flight responses from an earlier scenario cannot restore old results. Per-request fictional stores cannot leak real users or collide across visitors.

Local verification: the two unit tests cover repeated A/B/C graph runs, evidence-driven replanning, valid/invalid approvals and closed routes/inputs. Both multiprocessing and the Vercel subprocess execution path passed. Desktop/mobile browser suite repeats A/B/C/B/A/reset; comparison, clipboard, calendar and layout passed. Initial browser launch needed the existing installed Chromium path; no new browser service or infrastructure was introduced.

Public source scan checks credentials, private connection URLs, personal email patterns and private host/schema references without printing matching values. Public repository history is preserved from its original four public commits, not rewritten or replaced by private history. Existing rollback tag remains available. See README for hosted verification when complete.
