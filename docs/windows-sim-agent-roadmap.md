# Windows implementation roadmap: setup engineering agent

Date: 2026-10-30. Execute this on the actual Windows racing PC. SimHub is installed there; its version, SDK, compiler requirements and populated telemetry have not been inspected. This roadmap proposes the next implementation, rather than describing an existing integration.

The [browser prototype](../README.md) uses a fictional generic car. Its tyre envelopes, platform motion and setup comparisons illustrate assumptions; they are not connected to SimHub, calibrated to iRacing, or measurements of remaining grip. Preserve this distinction when adding real data. Follow the [project brief](project-brief.md), [design draft](design-draft.md) and [setup-engineering skill](../drafts/setup-engineering/SKILL.md).

The current finite player supports synthetic clips (including a Daytona-style chicane), play/pause, scrubbing and `setup-lab-scenario` version 1 control-trace JSON import. Imported speed/throttle/brake/steering remains input to the generic evaluator, even when declared recorded. This does not implement raw `.ibt` ingestion or the observed-channel capture/replay proposed below.

Work from local source only. The web app uses SvelteKit 3.1.1, Svelte 5.57.3, Vite 8.3.5, Three.js 0.187, TypeScript 6 and the Cloudflare adapter. See [Cloudflare deployment](cloudflare-deployment.md) for the current hosting configuration. Use Node.js 22.17 or newer; Node.js 24 is recommended. Sites, hosting configuration, publishing and source pushes are outside this task.

## Delivery order and boundaries

| Priority | Deliverable | Exit condition |
| --- | --- | --- |
| P0 | Installation and capability audit | Proven channels, units, timing and limitations for one car/build |
| P0 | Versioned recorder and deterministic replay | Same recorded input produces the same observable results |
| P1 | Local live bridge and engineering view | Freshness, disconnects and source classifications remain visible |
| P1 | Car/setup profile and controlled experiments | Changes are legal, traceable and repeatable |
| P2 | One calibrated response model | Meets declared criteria on runs excluded from fitting |
| Later | More cars, simulators and interactions | Each adds an adapter/profile and its own validation evidence |

Keep collection, deterministic calculations and agent explanations separate. The AI queries evidence and proposes test cards; it does not drive, operate vehicle controls, apply setups automatically or tune settings unattended. Retain user consent before changing installed SimHub/iRacing configuration, deploying a plugin or changing simulator settings. Prepare the exact diff, backup and rollback first. Read-only discovery and repository implementation can proceed independently.

## Phase 0 — inspect the actual PC

Record Windows, SimHub and iRacing versions; installation/user-data locations; selected car variant, track/layout and available disk space. Preserve installed configuration copies before proposing edits. Identify any existing plugins and their output locations.

Locate the shipped `User.PluginSdkDemo`, its solution/project files, referenced assemblies, documentation and examples. Inspect target framework, CPU architecture, language/compiler requirements, dependency versions and plugin loading instructions. Select the build tool from these files and tools already installed. **Do not assume modern .NET, .NET Framework, x64, or a particular SDK version.** Build the unchanged sample outside the installation folder before adapting it. Record assembly versions and hashes; prefer the documented public SDK surface. SimHub documents its sample and warns that undocumented interfaces can change. [Official SDK documentation](https://github.com/SHWotever/SimHub/wiki/Plugin-and-extensions-SDKs).

Use existing compiler/runtime tools where compatible. If a required component is absent, document the exact prerequisite and installation choice; do not silently install global tools. Retrieve relevant technology documentation through the project's required MCP tools before implementing code. If a requested connector is unavailable, record that and consult the shipped SDK and official documentation.

**Acceptance:** `environment.json` identifies the real versions, build command and prerequisites; the untouched sample builds or a precise missing prerequisite is recorded. No application configuration has changed.

## Phase 1 — prove channel capability

Inspect SimHub's property browser with iRacing running. Export its property/action inventory if the installed version supports JSON export; otherwise save a documented inventory. A property list is discovery evidence, not a recording. Enumerate the current native iRacing live variable headers and a newly recorded `.ibt` header separately: names, types, units, array counts and timing metadata. Inspect session/setup YAML and a Garage HTML export of the same loaded setup. Preserve raw artifacts.

Capture short, manually driven segments: stationary/pits, straight acceleration, braking, steady corner, a repeatable bump/kerb, then a pit visit. For each candidate, record whether it exists, is populated, changes as expected, has an understood sign/unit, updates continuously or only at a snapshot, and survives replay. Record observed update rate, gaps and constant-value intervals. A constant signal alone proves neither staleness nor validity; test it under an expected stimulus and preserve unknown status.

The capability matrix must cover controls, speed, accelerations, orientation/rates, lap distance, suspension deflection/velocity, ride heights, wheel speeds, pressures/temperatures, setup metadata and any load/slip signals actually exposed. Use **observed vendor names only**. Explain sensor position and reference frame where known; shock travel is not automatically wheel travel or ride height. Audit array/subsample channels without treating every stream as high-rate data.

Check live and disk availability independently. Historical iRacing tables and third-party channel lists are leads, not the installed contract. Temperatures may be pit snapshots; wheel-slip effects may be heuristics. Never fabricate temperature, slip, wheel-load or grip values to complete a diagram. SimHub cannot restore missing simulator measurements. See the [iRacing evidence and limitations](../research/iracing-feasibility.md) and [SimHub audit guidance](../research/simhub-integration.md).

If settings need adjustment, inspect current values and current official instructions first. The documented SimHub iRacing configuration mentions memory telemetry and a 360 Hz logging setting; neither is permission to overwrite `app.ini`. Disk recording is a separate requirement. [Official game configuration](https://github.com/SHWotever/SimHub/wiki/SimHub-Basics----Games-config-and-troubleshooting), [official iRacing telemetry quickstart](https://ir-core-sites.iracing.com/dev/atlas/atlas_quickstart.pdf).

**Acceptance:** a saved matrix links every supported channel to representative samples and records unsupported, snapshot and unresolved channels explicitly. Choose the first measurable engineering question only after this audit.

## Phase 2 — implement stable capture and replay

Suggested repository layout: capture folders/interfaces are proposed additions; the web paths identify the local SvelteKit app.

```text
contracts/v1/             # JSON schemas: capability, frame, run, profile, result, test-card
adapters/simhub/          # minimal SDK plugin; target discovered from shipped sample
adapters/iracing/         # optional native live reader and IBT importer
bridge/                  # recording, replay clock, local HTTP/WebSocket service
analysis/                # deterministic features, comparison, calibration
profiles/                # versioned car constraints and model definitions
tests/fixtures/          # small synthetic and approved recorded fixtures
captures/<run-id>/       # manifest.json, channels.json, frames.ndjson, events.ndjson
                         # raw/, setup.html, setup.yaml where available
results/<experiment-id>/ # test-card.json, comparison.json, validation.json
./
  src/routes/+page.svelte             # main illustrative UI
  src/lib/model.js                    # pure model, scenario v1 import and session v3
  src/lib/diagram.js                  # diagram geometry/force helpers
  src/lib/components/VehicleDiagram.svelte
  src/lib/components/ScenarioPlayer.svelte # finite control timeline/import
  src/lib/components/Explainer.svelte # Three.js explanation popup
  src/lib/explainer-scene.ts          # explanation scene and resource lifecycle
  tests/                              # Node test runner
```

Keep large raw captures local by default; track small fixtures and manifests deliberately. Keep original `.ibt` files alongside import provenance. Do not reverse-engineer undocumented SimHub `.telemetry` files into the product's interchange format; support SimHub replay only through its documented facilities. [Official replay CLI](https://github.com/SHWotever/SimHub/wiki/Command-line-interface).

Define one simulator-independent adapter boundary: `describe()` returns capabilities; `open(context)` starts a source; `read()` emits frames/events; `close()` ends it. Native iRacing and SimHub map observed properties into the same contract. Choose a native adapter only where audited SimHub gaps justify it; retain per-channel provenance and avoid combining two streams without verified clock alignment.

Every document has `schemaVersion`, identity and provenance. A run records simulator/build, adapter version, car/variant, track/layout, driver alias, conditions, setup/profile hashes, tyre/fuel context, source files and capture start/end. A channel definition records native identifier, internal identifier, type/count, units, axes/sign, conversion, live/offline/snapshot availability, classification (`measured`, `derived`, `estimated`, `snapshot`, `reference`) and dependencies.

Each frame records source sequence/tick when available, source simulation time, local monotonic receipt time, UTC receipt time and values. Each value has validity and quality flags; missing is `null` with a reason, never a valid zero. Track freshness relative to the correct clock, clock resets, pauses, dropped frames, disconnections and session boundaries. Preserve snapshot age. Derivatives require valid time intervals; do not interpolate through session changes or silently upsample.

Reject incompatible major schema versions and invalid units/types; migrate older formats explicitly with provenance. Keep the prototype's version 1 control traces and version 3 sessions distinct from recorded runs and calibrated profiles. Sessions embed the full custom trace; valid version 2 sessions migrate with no custom trace, and version 1 sessions remain unsupported. Importing an illustrative session or a control trace labelled recorded must never grant its evaluated forces measured status.

The SimHub callback should copy only selected values into a bounded queue. Perform serialization, disk writes and transport outside the callback; expose queue drops and capture errors. The author's publisher demonstrates `DataUpdate` export and identifies it as performance critical. [Official publisher source](https://github.com/SHWotever/SimHub-MQTT-Publisher/blob/main/SimHubMQTTPublisherPlugin.cs).

**Acceptance:** fixture tests cover missing/zero values, snapshots, unit conversion, arrays, pauses/resets, gaps, unknown versions and malformed imports. Replaying a saved run preserves order/timing and reproduces derived results within declared numerical tolerance. Live disconnect/reconnect never leaves apparently fresh values behind.

## Phase 3 — connect the UI and agent

Start with replay at original speed, seek, pause and a shared cursor for aligned plots. Then add a local bridge bound to loopback. Suggested proposed interfaces are `GET /v1/capabilities`, `GET /v1/runs/{id}/manifest`, `GET /v1/runs/{id}/frames`, `GET /v1/profiles/{id}`, `GET /v1/results/{id}` and `/v1/live` WebSocket. Specify pagination/time ranges, message versions and error responses before implementation.

Display mode, source, units, freshness and model status beside important values. Unsupported wheels/channels remain unavailable; use measured chassis/platform signals only when their meaning is established. Retain the illustrative view as a separately labelled mode. No animation alone proves contact loss or grip reserve.

Preserve the latest user correction: one fixed Ferrari 296 GT3 perimeter traced from the true overhead VELOREX render, with springs attached and no additional chassis rectangle or panel lines. The [visual reference](../research/car-outline/README.md) does not change the generic model. Front-wheel graphics use nonlinear visual steering up to ±40° while the model retains 14:1 steering. The small inner aero platform translates and projects pitch/roll about a visible pivot from total dynamic rake and roll; translation responds to rake/wing/front-aero balance and driving pitch. Capacity rings share a fixed area scale without a radius cap or automatic rescaling, with numeric capacity in kN primary and normal load secondary.

Retain the capacity decomposition: a dashed mechanical reference at the same speed, setup, controls and bump with vertical downforce removed and drag retained; total capacity; and the exact signed nonlinear aero difference, shown as an annulus and numeric breakdown. The bump heuristic can make that difference negative at one wheel, shown coral. This is a generic counterfactual comparison, not a measured grip channel.

Force arrows represent road-on-tyre force: `Fx` forward, `Fy` right, plotted as `(Fy, -Fx)`; tyre-on-road reaction is opposite. Future adapters must declare tyre/body/world frames and transform explicitly rather than reusing these display signs implicitly. Three.js explainers illustrate mechanisms; they add no measured telemetry or calibrated physics. Keep the aero popup's one small platform inside its wireframe at fixed centre height `Y = 1.03`, with local tilt controls up to ±24°.

Agent operations should inspect capabilities, query a corner/phase, compare runs, retrieve provenance, evaluate a supported bounded scenario and draft an experiment. Results include inputs, excluded intervals, methods/version, assumptions, metrics, uncertainty, tested domain, evidence paths and limitations. Return structured `unsupported` or `insufficient_evidence` results when prerequisites fail. The engineering skill consumes these artifacts; it must not claim unexecuted tool operations succeeded.

**Acceptance:** a replay demo and a manually driven live capture agree on source values; the UI visibly distinguishes measured, snapshot, estimated and unavailable data. Agent JSON results link back to exact run/time intervals and remain understandable without screenshots.

## Phase 4 — profiles, experiments and calibration

Build the first profile from the actual car's Garage export/manual and observed settings. Record legal ranges, increments, units, linked settings, fixed-series restrictions, dependencies and evidence/build identity. Mark unknown limits unavailable. Never infer damper curves, aero maps or motion ratios from a click count. Candidate edits are reviewable suggestions with original/candidate values and a recoverable baseline; the driver applies approved changes manually.

Choose one identifiable outcome, for example observed suspension response to a repeatable bump if channels support it. Define the event/phase, driver procedure, controlled conditions, metrics, acceptable error and revert criteria before collecting fitting data. Include braking and exit checks where a change might harm stability. Use repeated baseline runs, a small legal one-setting sweep, and baseline repeats to estimate drift and driver variability. Record invalid laps and exclusion reasons. Agree required repeats from observed variability; do not invent a universal sample count.

Fit only supported relationships and record units, parameter uncertainty and identifiability limits. Keep whole runs/setups out of fitting for validation; adjacent samples from the same lap are not independent held-out evidence. Compare against a simple baseline predictor. Report residuals by phase/speed/condition, interval coverage, failure cases and the valid setting range. If criteria fail, retain observed replay and publish the failure. Revalidate after relevant simulator/car updates. No guaranteed lap-time gain, tyre-force reconstruction or extrapolation to another car/track follows from one successful fit.

**Acceptance:** reproducible analysis produces a machine-readable validation report meeting predeclared criteria on unseen runs, or an explicit failed/inconclusive result with the next experiment.

## Next agent kickoff

1. Read this roadmap and the linked research/skill; inspect the repository and local instructions. Preserve the prototype's illustrative labels.
2. Establish the Windows working copy. In the repository root, use `npm ci`, `npm run check`, `npm test` and `npm run build`. `npm run dev` runs Vite at `127.0.0.1`; `npm run preview` and `npm start` build and serve the app through the local Cloudflare Workers runtime. Hosting uses the GitHub-connected `main` branch; see [Cloudflare deployment](cloudflare-deployment.md).
3. Read-only PowerShell discovery can begin with `Get-Location`, `Get-Command dotnet,msbuild -ErrorAction SilentlyContinue`, and `Get-Process SimHub* -ErrorAction SilentlyContinue | Select-Object ProcessName,Path`.
4. After verifying the installation location, assign `$simHubInstall` to that actual path. Inspect samples with `Get-ChildItem -LiteralPath $simHubInstall -Recurse -Filter *.csproj` and `Get-ChildItem -LiteralPath $simHubInstall -Recurse -Filter *.sln`. Inspect project contents before choosing a build command.
5. Save `captures/audit/environment.json`, SDK/sample findings, property export, native live/IBT inventories and `capabilities.json`. Then implement contract fixtures and replay before requesting a plugin deployment/configuration change.

Audit and replay can start immediately. Real calibration additionally needs the user's first car/variant, track/layout, target handling problem, driver availability for repeated manual runs, controllable session conditions, and acceptable stability/prediction criteria. These choices materially determine the experiment; record them before fitting. Broader simulator coverage can wait.
