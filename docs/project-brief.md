# Project brief

Status: requirements captured and updated on 2026-10-30. The user subsequently requested a simple web visualization, corrected its delivery to a local project, and requested a Windows-agent implementation roadmap. The local SvelteKit 3/Svelte 5 application includes Three.js explainers; the broader calibrated engineering product remains in discovery. Verification evidence belongs in the application's verification record.

## User's goal

Build a tool for the team's setup engineering: understand how rake, aero, anti-roll bars, springs, dampers, bump stops/packers, brake bias, and other available parameters interact across situations. Support choosing a safer or faster balance, including sudden bumps, braking, acceleration, and transitions, and expose counteracting effects rather than isolated slider tips.

The user wants car-specific limitations and characteristics accessible to AI; calibration to car/track combinations; estimates of grip behavior and its progression around a course; comparisons of different setups and car characteristics; and a real-time dynamics view for an engineer, inspired by the reference overlay.

## Explicit scope and corrections

- General tool across simulators; **iRacing is the team's current main simulator**.
- The original LMU-first assumption is superseded. LMU remains a possible later adapter and a video reference.
- Everything starts fresh: no supplied telemetry recordings, setup files, calibrated profiles, or selected first car/track.
- User suggests SimHub for real-time data/plugin integration and a web application for remaining analysis and visualization, with importable/exportable profiles.
- User suggests a colocated AI skill for the setup-building process, informed by the second video.
- The complete video/transcript/media archive is retained separately; this code repository includes the research notes and original source links.
- The visualization should be developed and run locally. The earlier hosted Site direction is superseded; this task does not authorize publishing. Removing its links from current documentation does not establish that the former hosted resource was deleted.
- Latest user correction: use the actual Ferrari 296 GT3 silhouette as one continuous perimeter hand-traced from the true overhead VELOREX team render, with no additional chassis rectangle or panel lines. Keep it fixed and attach springs to it; the [outline references](../research/car-outline/README.md) do not make the force model Ferrari-specific.
- Exaggerate visual front-wheel steering nonlinearly up to ±40° (about 18.6° at 20° input), while retaining the model's 14:1 steering ratio. Keep a small 56 × 80 aero platform inside the perimeter, translating and showing projected pitch/roll around a visible pivot from total dynamic rake and roll. Translation should respond to rake/wing/front-aero balance and driving pitch.
- Show capacity in kN as the primary tyre value and normal load secondary. Use a shared fixed circle-area scale without a radius cap or automatic rescaling; the model already has no capacity ceiling.
- Further user correction: distinguish natural/mechanical capacity from added aero capacity. Evaluate the mechanical reference at the same speed, setup, controls and bump with vertical downforce removed and drag retained; show its dashed ring, the total ring and the signed nonlinear difference as an annulus and numeric breakdown. Preserve a negative difference visibly when the bump heuristic produces one.
- Show progression through finite approach/braking/apex/acceleration clips, including an explicitly synthetic Daytona-style chicane. Provide a control timeline with play/pause, scrub and an end stop, plus timed control-trace JSON import. Embed custom traces in version 3 sessions and accept valid version 2 sessions. Imported controls still drive an illustrative model; raw iRacing `.ibt` ingestion remains future work.
- Explain tyre forces, aero and suspension/anti-roll-bar relationships through interactive 3D popups. The aero popup uses one small inner platform inside the wireframe at fixed centre height `Y = 1.03`, with local tilt controls up to ±24°. State which body each force acts on and keep requested force, reaction force, inertial tendency and measured telemetry distinct.

## Situations the tool should help investigate

- A bump or kerb causes a sudden balance change during trail braking.
- A safer entry setup produces excessive understeer elsewhere.
- An adjustment improves throttle application but changes braking or high-speed stability.
- Ride height, wing, roll stiffness, damping, and bump-stop engagement interact.
- Different drivers prefer different stability margins at the same circuit.
- A car's adjustment limits or missing telemetry constrain what the AI can conclude.

## Candidate success criteria — proposed, not agreed thresholds

1. An engineer can trace a proposed change to a hypothesis, affected phases/corners, expected tradeoffs, and evidence.
2. The same setup/profile/run information is readable by both the web tool and AI.
3. Unknown or unavailable data stays explicit; no fabricated per-tyre grip percentages.
4. Calibration improves predictions on held-out runs, with the tested range and error recorded.
5. A more stable setup can be evaluated by repeatability and recovery as well as peak pace.

## Open implementation choices

Exact first car, track, vehicle-model complexity, live transport and calibration protocol remain undecided. The current local prototype uses SvelteKit 3, Svelte 5 and Three.js; this establishes its implementation stack without selecting the final calibrated product architecture. Team access and any future hosting would need a separate decision. There is no simulator running on this Mac and no verified Windows SimHub SDK/build environment in this workspace.

The local illustrative application is at the repository root; see its [README](../README.md), [verification record](../verification.md), [force conventions](force-conventions.md) and [Windows implementation roadmap](windows-sim-agent-roadmap.md). No simulator plugin, live connection, real car profile or quantitative calibration has been built.
