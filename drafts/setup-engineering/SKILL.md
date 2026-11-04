---
name: setup-engineering
description: Use when a sim-racing team is building or comparing car setups, investigating phase-specific handling or bump instability, or planning car-specific calibration experiments across iRacing and other simulators.
---

# Setup engineering

Draft reference skill. Use by explicit file reference; not installed globally. Support the team's handling objective with a reproducible experiment and an evidence trail. No simulator connection or calculation API is bundled.

## Establish the operating context

Use the selected simulator/build, car variant, circuit/layout, current setup, available adjustment ranges, tyre/fuel/track state, and driver observations. Identify braking, turn-in, steady cornering, throttle transition, acceleration, or a particular bump/kerb event. Ask only for missing context that changes the next experiment.

If starting without data or an identified car, provide a generic test protocol and label model outputs uncalibrated. Preserve unknown numbers as unavailable rather than inventing exact setup values or tyre grip reserves.

## Run the setup loop

1. State the target behavior and baseline. Retain a known recoverable setup and comparable run conditions.
2. Separate observations from mechanism hypotheses. For a bump snap, consider travel limits, platform movement, locking, transient load/contact disturbance, and driver input only as candidates until evidence distinguishes them.
3. Select one mechanism to test. Use a legal, recorded adjustment increment from the actual car profile. When several changes must be paired, document the group and avoid attributing the result to one member.
4. Specify the target phase/corner and expected benefit, other phases at risk, observable acceptance criteria, and revert conditions. Recheck the baseline's critical stability situations.
5. Compare repeatable runs; account for conditions and execution differences. Record observations, confidence, and the keep/revert/next-test decision. Separate fitting runs from validation runs when calibrating a model.

Treat aero/platform, springs/ARBs, damping, bump stops, brake balance and differential behavior as interacting mechanisms. Do not assume changing one phase leaves another unchanged. Distinguish damper shaft speed from road speed and static heights from dynamic travel.

## Evidence and output

Identify each important value as measured, derived, estimated, a snapshot, or a visual reference. Check channel availability, units and freshness for the actual simulator/car. A slip cue or friction-circle reference is not measured remaining grip.

Return a concise engineering explanation and an AI-readable test card containing: context, objective, observations, hypothesis, exact known changes or unavailable values, expected effects/tradeoffs, acceptance/revert criteria, required evidence, confidence, and next action. Cite supporting runs, profile entries or source timestamps. Do not imply that proposed model/tool operations have been executed.

## Source use

Read [source-method.md](references/source-method.md) when applying the archived video's staged workflow. Read the relevant simulator research from the project before interpreting its telemetry. The first target is iRacing; LMU video settings are contextual examples. Minimum ride height/pressure/camber, fixed slip thresholds, and a fixed wing/rake relationship are not universal setup defaults.
