# iRacing engineering-model feasibility

Sources checked: **2026-10-30**. This report assesses access to data and physical-model evidence. It does not establish measured behavior for a particular current car or build; no telemetry, setup file or live session was available for inspection.

## Conclusion

iRacing is a plausible starting point for an **experimentally calibrated engineering assistant**. Its interfaces provide useful observations and garage settings, but the material reviewed does not expose a complete, calibrated vehicle model. Exact tyre forces, universal live grip remaining, complete tyre laws and full aero maps are **not established as publicly available channels or parameters**. Their absence from the sources reviewed is not proof that no car-specific channel could ever exist. A current per-car channel audit is necessary before promising any measurement.

With no starting telemetry, only qualitative predictions are defensible. Controlled baseline runs and setup sweeps could calibrate restricted models and quantify prediction error. Predictions about setup changes over bumps, braking, acceleration and a full lap should carry their tested operating range and uncertainty.

## Data paths and sampling

iRacing's own SDK header describes live telemetry through a Windows shared-memory mapped file, slowly changing YAML session information, and disk telemetry. Variables are normally published at 60 Hz. The header says available variables depend on the car and session. Selected `_ST` channels carry multiple samples within a frame for 360 Hz signals; this does not make every channel a 360 Hz stream.

The accessible SDK source is a **community mirror of iRacing's copyrighted SDK**, not a current official repository. It supports the interface description, not a guarantee of the channel inventory for the current simulator build.

- [SDK header, community mirror](https://github.com/vipoo/irsdk/blob/master/irsdk_defines.h)
- [SDK mirror and update history](https://github.com/vipoo/irsdk)
- [Current community-wrapper generated channel reference](https://irsdk-node.bengsfort.dev/API-Reference/irsdk-node-types/interfaces/TelemetryVarList/)
- [Official support: telemetry SDK is separate from the web /data API](https://support.iracing.com/support/solutions/articles/31000177790-oauth-client-credentials)

## Live versus recorded data

The clearest iRacing channel table located is **historical, dated 2015**. It must not be treated as a verified 2026 capability contract. A present variable name also does not prove that its value updates continuously on track.

| Signal | Evidence reviewed | Consequence |
| --- | --- | --- |
| Steering, throttle, brake, speed, accelerations, yaw/pitch/roll and rates | SDK/community-wrapper channel references | Useful observations for braking, acceleration, cornering and platform analysis; validate availability and interpretation for the selected car. |
| Shock deflection and shock velocity | Historical iRacing table and current community-wrapper inventory, including selected `_ST` forms | Candidates for live suspension movement and bump-response analysis. Shock travel is not automatically identical to wheel travel or ride height. |
| Corner ride heights | Historical iRacing table marks them disk-only | Use recorded data for initial platform calibration; do not promise live corner ride heights without a current audit. |
| Hot tyre pressure and tyre surface temperatures | Historical table marks them disk-only | Offline analysis may have information that a live engineer display cannot receive. |
| Tyre carcass temperatures and wear | Historical table marks them available in live data; a current community maintainer documents pit measurements held through the stint | An exposed channel can be stale during a lap. Do not label these as continuous live tyre state. |
| Individual wheel speeds | Historical table marks `LFspeed` and equivalents live; current community-wrapper inventory inspected does not list them | Availability is unresolved for a current car/build. Do not promise a live wheel-slip measurement or invent alternative SDK keys. |
| Individual tyre forces, tyre normal loads, exact grip remaining | No universal current official channel guarantee established in the reviewed material | Treat calculated quantities as model estimates and identify their inputs and uncertainty. |

Sources:

- [Historical iRacing telemetry table, 2015 PDF](https://us.v-cdn.net/6034148/uploads/8DD84H30FIC8/telemetry-11-23-15.pdf)
- [Community transcription identifying its historical date](https://gist.github.com/teknologika/0127fa9a031ec686537277a954972ad0/8218ca1086a71e517ee22174afd6479f5f451a7a)
- [Community-wrapper channel inventory](https://irsdk-node.bengsfort.dev/API-Reference/irsdk-node-types/interfaces/TelemetryVarList/)
- [Current community-maintainer clarification about pit-only temperature updates](https://github.com/niklam/iracedeck/issues/254)

The tyre-temperature clarification is maintainer evidence, not an official iRacing specification. The discrepancies above are reasons to inspect real channel headers and update behavior before relying on them.

## Recorded telemetry and comparisons

iRacing's official quickstart documents arming disk telemetry with `Alt-L`, writing `.ibt` files under the user's iRacing telemetry folder and comparing traces against distance around the circuit. Distance alignment is useful for comparing braking zones, bumps, corner phases and setup sweeps.

The quickstart is historical and contains old ATLAS installation instructions; the recording and analysis concepts are the relevant evidence here. Current logging settings and channel content should be verified in the simulator.

- [Official telemetry quickstart](https://ir-core-sites.iracing.com/dev/atlas/atlas_quickstart.pdf)

## Garage settings versus a physical vehicle model

iRacing's official setup-export explanation says the Garage's Export button creates an HTML representation of the currently loaded setup, including springs, shocks, corner weights and deflections. This is a useful human-readable input for an assistant and a reference for reproducing a setup.

The historical release-note archive says current setup information can accompany both live telemetry and disk `.ibt` files, controlled by `irsdkLogSetup`. A tool should inspect whether this section is actually present. Setup capture can be disabled, and schemas differ across cars.

A garage setting is not necessarily a physical curve. For example, a damper click does not by itself supply the complete force-versus-shaft-velocity curve. Static corner weights and deflections do not uniquely determine suspension geometry, motion ratios, inertias or transient tyre state. A captured setup describes the configuration at the captured moment; it does not establish every changing in-car adjustment or the dynamic state throughout a run.

- [Official explanation of setup HTML exports](https://www.iracing.com/commodores-garage-26-pre-build-prep-post-season-tests/)
- [iRacing historical release-note archive, including setup logging](https://us.v-cdn.net/6034148/uploads/OWC6QXAD3CYE/release-notes-history.pdf)
- [Community-wrapper setup schema](https://irsdk-node.bengsfort.dev/API-Reference/irsdk-node-types/interfaces/CarSetupInfo/)

## Aero information

Some official car manuals describe garage aero calculators that accept wing settings and dynamic ride heights to report aero balance and downforce-to-drag ratio. The F4 manual explicitly distinguishes aerodynamic efficiency from total downforce. The IR18 manual additionally describes front/rear ride-height and chassis-roll inputs.

These calculators can support controlled sampling of platform sensitivity. They are not evidence of a complete exported aero-force map, absolute downforce at all speeds or a universal calculator across all cars.

- [Official FIA F4 manual, aero calculator on page 13](https://s100.iracing.com/wp-content/uploads/2023/10/FIA-F4-Manual-V2.pdf)
- [Official Dallara IR18 manual](https://s100.iracing.com/wp-content/uploads/2023/10/Dallara-IR18-Manual.pdf)

## Required per-car channel audit

Before making a calibrated model or configuring a live SimHub engineer view, record the simulator build, exact car/version, track/layout and conditions. Then audit:

1. Enumerate live shared-memory headers and a recorded `.ibt` header separately. Preserve names, types, units, counts and sampling metadata.
2. Check whether setup YAML is present and compare it with a Garage HTML export of the same loaded setup.
3. Verify candidate signals while stationary, driving, braking, crossing a bump and visiting the pits. Record missing, zero, stale and continuously updated channels separately.
4. Check wheel-speed, ride-height, tyre-temperature and pressure claims explicitly. Confirm availability rather than inferring it from a different car, an in-game dashboard or an old SDK table.
5. Confirm sensor locations and sign conventions before converting shock travel into wheel travel, platform heights or inferred load.
6. Trace every displayed value to a raw simulator channel, a held pit measurement or a calculated estimate. SimHub cannot restore information absent from its input stream; its exact exposed properties require a separate inspection.

## Limits on identification and prediction

This is an engineering inference from the available interfaces: observations of vehicle motion and garage settings do not uniquely recover the simulator's internal tyre force/slip/load/temperature laws, suspension geometry, complete damper curves or full aero maps. Multiple parameter combinations may reproduce a measured lap. Predicting an untested setup or condition can therefore be materially less reliable than reproducing a calibrated baseline.

A useful first model would predict limited, testable effects such as suspension motion, platform response, bottoming risk and balance trends within a defined range. Exact contact-patch grip, guaranteed lap-time changes and precise lap-wide counterfactuals require evidence beyond the sources reviewed. Calibration should use controlled changes, repeated runs and held-out validation laps, with build changes tracked because iRacing changes vehicle behavior over time.

The official setup-development article itself describes controlled tests, single-setting changes, and comparisons of ride-height, pitch/roll and tyre behavior; it provides primary-source support for that experimental approach.

- [Official setup-development and testing explanation](https://www.iracing.com/commodores-garage-26-pre-build-prep-post-season-tests/)
