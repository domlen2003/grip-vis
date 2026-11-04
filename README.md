# Grip Vis — setup dynamics sandbox

A local SvelteKit 3/Svelte 5 application inspired by the archived grip visualization, with Three.js explanation popups. **Illustrative generic GT response; no simulator connected or measured grip reserve. Imported recorded controls do not validate the model.** This repository contains the local application and its development/research notes.

## Run locally

Install Node.js 22.17 or newer. From the repository root, on Windows, macOS or Linux:

```sh
npm ci
npm run dev -- --port 4173
```

Open [localhost:4173](http://127.0.0.1:4173). The development server binds to `127.0.0.1`. Keep it running while using the app; stop it with Ctrl+C.

The project provides these checks and build commands:

```sh
npm run check
npm test
npm run build
```

`check` runs SvelteKit synchronization and Svelte/TypeScript checking. `test` runs the model and diagram helper suites. See [verification.md](verification.md) for recorded commands, test counts and outcomes.

After building, run the Node adapter output locally:

```sh
HOST=127.0.0.1 PORT=4173 npm start
```

In PowerShell, set the environment variables first:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '4173'
npm start
```

`npm start` runs `node build`; it requires a successful build. `npm run preview -- --port 4173` is also available for a local Vite preview. Development, preview and production startup are separate checks; a successful model test run does not establish that all three have been verified.

## What works

- Four tyre demand/envelope diagrams with a dashed natural/mechanical reference, total-capacity outline and shaded aero contribution, plus numeric total/natural/aero capacity in kN. Normal load is secondary. Road-on-tyre demand uses forward-positive `Fx`, right-positive `Fy`, and the screen mapping `(Fy, -Fx)`.
- Following the user's correction, a fixed Ferrari 296 GT3 exterior perimeter hand-traced as one continuous line from the true overhead VELOREX team render, without a separate chassis rectangle or panel lines. Springs attach to the perimeter. See the [local outline references](research/car-outline/README.md); this visual shape does not change the generic vehicle model.
- Front-wheel graphics use nonlinear visual steering up to ±40°, with about 18.6° at 20° input. A small 56 × 80 inner aero platform translates and shows projected pitch/roll around a visible pivot; total dynamic rake and roll drive its tilt, while rake/wing/front-aero balance and driving pitch affect its position. The perimeter stays fixed.
- Interactive 3D popups for tyre forces, aero platform and suspension/anti-roll bars, with orbit/zoom and camera buttons. The aero view has one small inner platform inside the wireframe, centred at fixed height `Y = 1.03`, with local tilt controls up to ±24°. The tyre view distinguishes road-on-tyre force from the opposite tyre-on-road force. Explainer controls are local to the popup and do not change the main setup.
- Speed, throttle, brake and steering inputs. Editing a driver input switches to manual mode and pauses scenario playback.
- Ride heights, wing, spring/roll stiffness, damping, compression travel and brake-bias controls.
- Finite trail-braking, power-exit, fast-sweeper and synthetic Daytona-style chicane clips, with a control timeline, phase labels, play/pause, scrub, restart and stop at the final frame; a separate front-left bump disturbance.
- A pinned setup baseline recalculated under the same maneuver, with dashed envelopes and aero/rake deltas.
- Timed control-trace JSON import, JSON session export/import with the full custom trace embedded, strict validation, local browser persistence, and preserved playback position.
- Responsive layout, native keyboard controls, `P` for play/pause and `B` for bump. Popups close with their close button or Escape and show a text fallback when WebGL cannot initialize.

## Code map

| File | Responsibility |
| --- | --- |
| `src/routes/+page.svelte` | Controls, animation, comparison, persistence, session files and lazy popup loading |
| `src/app.css` | Responsive dark engineering workspace |
| `src/lib/components/RangeField.svelte` | Labeled numeric/range controls |
| `src/lib/components/ScenarioPlayer.svelte` | Finite control timeline, playback controls, scrubber and scenario import |
| `src/lib/components/VehicleDiagram.svelte` | Fixed Ferrari perimeter, spring attachments and SVG tyre-force diagrams |
| `src/lib/diagram.js` | Force-coordinate transforms, physical/visual steering, spring paths, capacity-ring scale and projected aero-platform placement |
| `src/lib/components/Explainer.svelte` | Accessible dialog, explanatory controls and WebGL fallback |
| `src/lib/explainer-scene.ts` | Three.js tyre, aero and suspension scenes and renderer cleanup |
| `src/lib/model.js` | Pure illustrative evaluator, mechanical/aero decomposition, finite scenario sampling and import/session validation |
| `tests/model.test.js` | Model invariants, capacity decomposition, scenario sampling and import/session contracts |
| `tests/diagram.test.js` | Force signs/observers, clipping, capacity scale, steering, aero projection/bounds and spring-attachment tests |
| `vite.config.ts` | SvelteKit, Svelte rune compilation and Node adapter configuration |

SvelteKit provides the application/build structure and Three.js provides the client-side 3D scenes. No server API or telemetry integration is implemented. Raw videos, captions, transcripts, reference photographs and PDFs are excluded; the notes retain their original source links. The lockfile records the dependencies used by `npm ci`; generated `build/` output is not the source project.

## Model assumptions and limits

The fictional rear-wheel-drive car uses 1,250 kg mass, 2.8 m wheelbase, 1.64 m track, 0.35 m CG height, 48% static front load and a fixed 14:1 steering ratio. The exaggerated visual steering does not change that ratio or the physical road-wheel readout. The Ferrari outline is a visual reference only. The spring controls act as effective wheel rates with an assumed 1:1 motion ratio.

Normal-load transfer is a simple algebraic illustration. Aero load/drag grow with squared speed using assumed wing/rake coefficients; they do not come from a real car's aero map. Force capacity uses a fictional load-sensitive power law. Lateral force is requested demand from steering and speed, not the force delivered by a solved trajectory. Inputs can request more force than the envelope can support; that does not identify actual tyre slip or how an actual vehicle would respond.

Capacity has no model ceiling. Rings use the same fixed area scale for every tyre and baseline: `radius = 50 × sqrt(capacityN / 4350)` in SVG units, without the former 80-unit radius cap or automatic rescaling. Circle area, rather than radius, is proportional to capacity.

“Natural” is the mechanical-capacity reference evaluated at the same speed, setup, controls and bump state with vertical downforce removed and aero drag retained. It is not a zero-speed substitute. Each wheel's signed aero contribution is exactly `aeroCapacityN = capacityN - mechanicalCapacityN`, after the nonlinear load-sensitive capacity calculation. The shaded annulus spans the mechanical and total rings. A coral annulus marks a negative difference, which the bump redistribution heuristic can produce; it is not evidence that real aero reduces grip at that tyre. Both components remain illustrative.

The bump is a three-second decaying load redistribution, influenced by the damping index. It is not a road-contact/suspension solver. Spring displacement is capped at travel limits; no bump-stop force curve or aero stall is calculated. Platform graphics and popup motion are explanatory, not a dimensionally accurate suspension animation or a measured centre of pressure. Very large demand vectors are clipped to keep the diagram readable while preserving direction; their numeric model usage remains visible.

Read [force-conventions.md](docs/force-conventions.md) before interpreting the dots or arrows. Tyre contact force, net vehicle acceleration and a passenger's inertial tendency are different quantities. The popup's equal-and-opposite pair acts on two different bodies; it does not cancel the tyre force on the car.

Neither balance indicators nor the baseline comparison establish a real setup improvement, safe limit, optimal pressure or lap-time gain. No tyre temperature/wear model, differential, validated car profile, track model, raw iRacing `.ibt` importer or live adapter exists yet.

## Scenario playback and control-trace import

The built-in clips are synthetic: trail braking (16 s, approach through braking/apex/acceleration), power exit (8 s), fast sweeper (12 s), and a Daytona-style chicane (24 s). The chicane is a designed left/right sequence, not a recorded lap or a calibrated track model. Controls interpolate linearly between samples; playback stops at the exact final frame. Scrubbing pauses playback, and Replay starts again from the beginning.

Use **Import scenario** for `kind: "setup-lab-scenario"`, `schemaVersion: 1` JSON with `title`, `source` and `samples`; a [small synthetic example](tests/fixtures/scenario-example.json) is included. `source.kind` is `"recorded"` or `"synthetic"`, with optional `simulator`, `car`, `track` and `notes`. Each sample requires `time` in seconds, `speed` in km/h (0–300), `throttle` and `brake` in percent (0–100), and steering-wheel `steering` in degrees (−120–120); `phase` is optional. Files must be within 8 MiB and contain 2–50,000 samples, starting at time zero with strictly increasing times, ending within 1,800 seconds. Unknown fields and invalid values are rejected rather than silently clamped.

An imported trace supplies controls to the generic evaluator. Its recorded/synthetic metadata is the file author's declaration; importing it does not establish measured tyre forces, calibrated grip, or actual iRacing replay. Raw `.ibt` conversion remains future work.

## Session contract

`kind: "setup-lab-session"`, `schemaVersion: 3`, `model: "generic-gt-v1"`, numeric `setup`, numeric `inputs`, `scenarioId`, `scenarioTime`, a setup-only `baseline` or null, and `customScenario` containing the full control trace or null. `scenarioId: "imported"` requires that trace. Playback position is saved and bounded to the clip duration; importing pauses playback until the user resumes. The bump pulse is not persisted. Session JSON is limited to 16 MiB. Unknown fields, non-finite/out-of-range values, unsafe object keys and unsupported versions are rejected. Valid version 2 sessions migrate to version 3 with `customScenario: null`; version 1 is rejected because it lacks a playback position.

For scenario playback, the saved playhead is authoritative: controls are sampled at that exact time on save/restore. Manual mode preserves its supplied controls. Older version 2 sessions retain setup, baseline and the bounded playhead, while adopting the current finite clip's controls at that position.

This is a **prototype session**, not a recorded telemetry run or a calibrated car profile. Keep those contracts separate when implementing the [Windows SimHub/iRacing roadmap](docs/windows-sim-agent-roadmap.md).

## Verification and next work

See [verification.md](verification.md) for the recorded model/browser checks. A screenshot or result from the previous static prototype does not verify this SvelteKit migration or its production build. Start the actual-machine integration with the roadmap's read-only installation/channel audit, then a recorder and deterministic replay. Preserve the current illustrative mode when adding an observed-data mode.

## Notes and handoff

See the [documentation index](docs/README.md) for requirements, model conventions, design, simulator research and the Windows/SimHub roadmap. [Repository preparation](docs/clean-copy.md) records the contents and checks of this clean copy.
