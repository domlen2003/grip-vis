# Setup engineering tool — design draft

Status: broader product proposal, 2026-10-30. Based on the [project brief](project-brief.md), inspected video references, and cited integration research. A local SvelteKit 3/Svelte 5 application with Three.js explanation popups is implemented in the repository root; real-machine integration and calibrated numerical models remain future work. Publishing is outside the current scope. See the [local run instructions](../README.md), [verification record](../verification.md) and [Windows implementation roadmap](windows-sim-agent-roadmap.md).

## Intended engineering loop

Start from a setup and a handling objective, identify the phase/corner/event, form a mechanism hypothesis, choose a bounded experiment, observe the result, and retain or revert the change. Preserve consequences elsewhere in the lap. A gain in one corner should remain visible alongside any lost stability, consistency, or pace in other corners.

The tool should be useful before real telemetry exists, through explicitly generic scenarios and assumptions. Those scenarios cannot be presented as calibrated behavior of an actual iRacing car. Later captures provide evidence for restricted, car-specific models.

## Current local visualization

Following the user's correction, the current application uses one fixed Ferrari 296 GT3 perimeter hand-traced from the true overhead VELOREX team render, without a separate chassis rectangle or panel lines; see the [local references](../research/car-outline/README.md). Springs terminate on that perimeter. The visual shape does not change the generic force model. Front-wheel graphics exaggerate steering nonlinearly to ±40° while the physical model retains 14:1 steering. A 56 × 80 inner aero platform translates and projects pitch/roll around a visible pivot: total dynamic rake and roll drive tilt, while rake/wing/front-aero balance and driving pitch affect translation. Its movement is not a measured centre of pressure or an aero map. The primary diagram remains SVG so its numeric labels and explanatory structure do not depend on WebGL.

Capacity rings share a fixed area scale (`radius = 50 × sqrt(capacityN / 4350)` in SVG units), without a radius cap or automatic rescaling. The dashed natural/mechanical reference evaluates the same speed, setup, controls and bump without vertical downforce, retaining drag; the signed aero contribution is the exact nonlinear difference from total capacity. The annulus shows that difference, coral when the bump heuristic makes it negative. Numeric total/natural/aero capacity in kN is primary and normal load secondary. These quantities are illustrative, and the generic model has no capacity ceiling.

Finite synthetic clips now cover trail braking, power exit, a fast sweeper and a Daytona-style chicane. A control timeline provides phases, play/pause, scrubbing, restart and an exact end stop. Strict `setup-lab-scenario` version 1 JSON imports timed speed/throttle/brake/steering controls; source metadata may declare them recorded or synthetic. Version 3 sessions embed the full imported trace and migrate valid version 2 sessions. These controls drive the generic evaluator: they do not establish observed tyre forces, calibrated track behavior or raw iRacing `.ibt` support. See the [scenario contract](../README.md#scenario-playback-and-control-trace-import).

Three.js scenes in modal popups explain tyre forces, aero and suspension/anti-roll bars. They provide camera orbit/zoom and local illustrative controls; the aero scene has one small inner platform inside the wireframe, at fixed centre height `Y = 1.03`, with tilt controls up to ±24°. Opening a popup pauses scenario playback, and its controls do not alter the main setup. The 3D code loads when first requested and releases its rendering resources when closed. A text fallback explains an unavailable WebGL view.

The numerical core stays separate from Svelte UI state and rendering. Pure model and diagram helpers have Node tests; Svelte/TypeScript checking, the build and real-browser flows require their own verification. The implementation is a local project with npm commands, not a hosted artifact. Current results and historical screenshots must be distinguished in the [verification record](../verification.md).

## Proposed components

| Component | Responsibility | Evidence boundary |
| --- | --- | --- |
| Simulator adapters | Enumerate and collect valid channels, units, timestamps, source identity, and setup metadata where supported | A property name alone does not prove useful live data |
| Car profile | Adjustment names/ranges, constraints, physical assumptions, supported model components, simulator/car/build identity | Unknown coefficients stay unknown; no universal GT3 values |
| Track and run context | Layout, lap distance, corner/phase labels, surface events, weather, fuel, tyres, driver, setup lineage | Separate circuit characteristics from one driver's trajectory |
| Dynamics/model core | Scenario evaluation, state estimation, sensitivity and calibration, confidence reporting | Predictions apply only inside their tested scope |
| Web analysis | Run comparison, scenario exploration, setup tradeoffs, replay and profile import/export | Illustrative graphics must retain their model status |
| Engineer live view | Selected current dynamics and diagnostics with freshness/quality indicators | No live temperature, slip, or grip guarantee across sims/cars |
| AI interface and skill | Query profiles/evidence, compare setups, request scenarios, plan experiments, record findings | AI explains and orchestrates; deterministic calculations remain inspectable |

SimHub is the preferred initial collection host suggested by the user. Its documented plugin/export pattern is feasible, but full engineering coverage needs an actual iRacing channel audit. A native simulator adapter remains an option where justified by verified gaps. See [SimHub research](../research/simhub-integration.md) and [iRacing research](../research/iracing-feasibility.md).

## Model and calibration levels

1. **Generic exploration:** configurable vehicle assumptions and synthetic situations. Useful for illustrating interactions; outputs explicitly uncalibrated.
2. **Observed replay:** real measured channels, snapshots, derived states, and labelled heuristic indicators. Replay does not predict an untested setup.
3. **Local calibration:** controlled setup/run comparisons fit selected response relationships within observed conditions. Preserve non-identifiability when different mechanisms fit the same traces.
4. **Validated prediction:** evaluate on runs and setups excluded from fitting. Report residual error and fail to extrapolate silently across car revisions, tyres, track states, or untested settings.

Choosing a full nonlinear vehicle model versus a smaller empirical/hybrid model remains open. A model should be selected because available data can identify and validate it, rather than because it can animate every suspension part.

## Setup interactions to represent

Describe braking, turn-in, steady cornering, throttle transition, acceleration, and bump/kerb response separately. Changes can influence several phases simultaneously; independent sliders for entry and exit balance are objectives, not a guarantee of independent physical control.

Candidate modeled quantities include platform motion, travel limits, roll/pitch response, effective axle balance, wheel contact disturbance, and observed steering/yaw response. Spring rates, ARBs, damper curves, motion ratios, bump-stop engagement and aero behavior require explicit profile definitions and validity ranges. Do not directly map “stiffer spring” to a fixed grip penalty.

Distinguish damper piston speed from vehicle road speed. Distinguish garage/static height from dynamic ride height and suspension travel. Treat direction, sign, units, saturation, latency, and sensor freshness as part of every adapter contract.

Use the documented [force conventions](force-conventions.md): vehicle `Fx` is positive forward, `Fy` positive right, and the SVG plot uses `(Fy, -Fx)`. Main-view vectors represent requested road-on-tyre force. The opposite tyre-on-road force belongs to the road's free-body diagram; passenger inertial tendency is a separate quantity. Steering the wheel graphic must not rotate a force already expressed in vehicle axes.

## Grip and course progression

Keep slip, realized force, estimated force capacity, available grip reserve, and event risk distinct. None is interchangeable with a normalized overlay circle. Initial grip-reserve outputs should be unavailable unless their definition and evidence support them.

Prefer distributions and trends by corner, phase, speed range, tyre state and axle over a single whole-lap average. Preserve short instability events that an average can hide. Any derived safety or aggression score needs an explicit definition and validation; it must not look like a measured tyre-force channel.

Track-wide counterfactuals depend on driver response as well as setup. An initial model could compare a fixed recorded maneuver or a bounded scenario. Predicting a different driver line or optimal lap time would be a separate, much larger capability.

## Proposed shared data contract

Runs and profiles should carry simulator/build, car/variant, track/layout, setup identity, driver, environment, fuel/tyre state, time base, lap distance and source references. Channels need units, sample timing, live/offline/snapshot availability, validity/staleness, and measured/derived/estimated/reference classification.

Model parameters need units, source, uncertainty, fitted domain, calibration version, and validation evidence. Setup changes need original value, candidate value, legal increments/ranges, dependencies, and the hypothesis they test. Missing values are distinct from valid zeros.

Candidate AI operations are capability inspection, run/phase querying, setup comparison, bounded scenario evaluation, experiment proposal, and evidence retrieval. These are proposed contracts, not implemented APIs. Each result should carry assumptions, uncertainty and provenance so an agent can explain why it reached a conclusion.

## Suggested implementation sequence

1. Agree on a first bounded scenario and an explicit generic car profile; make assumptions inspectable.
2. Establish the run/profile contract and acquire a first iRacing channel inventory plus garage export when a Windows sim session is available.
3. Add import and replay, setup lineage, event annotations, and a repeatable test-card workflow.
4. Calibrate one meaningful response using controlled runs and validate against held-out data.
5. Add further interactions and the live engineer view as channel quality and model validity justify them.

The local AI skill draft can support experiments before the product exists. No application dependency installation or product-code scaffolding is required to use the archived references and drafts.
