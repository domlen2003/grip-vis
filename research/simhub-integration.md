# SimHub integration feasibility

Checked: **2026-10-30**. Research only; no simulator, SimHub installation, recordings, or live channel population was inspected.

## Scope correction

The product is simulator independent, with **iRacing as the first target**. The earlier LMU-first assumption is superseded. There are no existing setup files, telemetry runs, or calibration profiles to reuse; the first capture must establish the actual available data.

## Verified from primary sources

- **Plugin support:** SimHub ships a C#/WPF `User.PluginSdkDemo` that can create properties and actions. Its documented SDK covers demonstrated core interfaces; undocumented components can break after updates. [Official SDK wiki](https://github.com/SHWotever/SimHub/wiki/Plugin-and-extensions-SDKs).
- **Telemetry callback and external publishing:** The author's MQTT publisher implements `IPlugin`, `IDataPlugin`, and `IWPFSettingsV2`, receives current and previous game data in `DataUpdate`, and serializes a selected payload to JSON for MQTT. Its comments identify the callback as performance critical and discourage plugins from consuming the generic raw-data object. This establishes an export integration pattern, not a guaranteed complete engineering data feed. [Official publisher source](https://github.com/SHWotever/SimHub-MQTT-Publisher/blob/main/SimHubMQTTPublisherPlugin.cs).
- **Demonstrated normalized channels:** That publisher reads speed, RPM, throttle, brake, clutch, gear, coordinates, current lap time, car model, and class. Its deliberately small payload is not an exhaustive SDK channel list. [Official car payload](https://github.com/SHWotever/SimHub-MQTT-Publisher/blob/main/Payload/Car.cs).
- **iRacing connection:** SimHub's game configuration guide requires memory telemetry enabled through `irsdkEnableMem=1` in iRacing's `app.ini`; it also specifies `irsdkLog360Hz=0`. Confirm current requirements in the installed versions before changing configuration. [Official game configuration](https://github.com/SHWotever/SimHub/wiki/SimHub-Basics----Games-config-and-troubleshooting).
- **Discovery:** The property browser can show game-specific properties. SimHub 9.12.7 added JSON export of available properties/actions. That is a discovery aid; the release note does not establish a time-series logging format or guarantee that every listed property is populated live. [Property browser documentation](https://github.com/SHWotever/SimHub/wiki/Dash-Studio---Bindings), [official release notes](https://github.com/SHWotever/SimHub/releases).
- **iRacing slip limitation:** In July 2026, SimHub's author explained that useful slip/slide data is deliberately withheld by iRacing and estimates can behave differently between cars. An earlier answer says SimHub's estimated wheel-slip cue requires ShakeIt processing and its result can be redirected to a property. Treat such a value as a heuristic/effect output, not measured tyre slip ratio or slip angle. [Author's explanation](https://github.com/SHWotever/SimHub/issues/2307), [effect export workaround](https://github.com/SHWotever/SimHub/issues/1006).
- **Recordings:** The CLI documents replay of existing `.telemetry` recordings. It does not document a stable public interchange schema. Do not make the web application's run format depend on undocumented replay-file internals. [Official replay CLI](https://github.com/SHWotever/SimHub/wiki/Command-line-interface).
- **Transport limits:** Built-in UDP forwarding applies only to games using basic send-and-forget UDP; it is not a universal bridge for shared-memory simulators. The author also reported that serializing complete datasets for games including iRacing can reach roughly 8 MB/s. [UDP forwarding guide](https://github.com/SHWotever/SimHub/wiki/Sharing-UDP-data-with-other-applications), [author's bandwidth explanation](https://github.com/SHWotever/SimHub/issues/1411).

## Unknown until a live capture

Do not claim that stock SimHub either universally provides or universally lacks ride heights, suspension travel, damper velocities, wheel loads, steering, or setup metadata. The reviewed official sources do not prove complete, continuously populated engineering coverage. Audit names, units, sign conventions, availability by car/session, effective sample rate, staleness, replay behavior, and whether values are measured, derived, or snapshots. Property existence and a numeric zero alone do not prove valid live data.

The research does not establish an official SimHub API that automatically discovers every garage adjustment, legal range, dependency, motion ratio, aero map, or bump-stop curve. Those need explicit, sourced car definitions and/or controlled calibration; observed telemetry alone is insufficient evidence of hidden physics parameters.

## Proposed design — inference, not a documented SimHub feature

Use a simulator-independent run/profile schema with a SimHub adapter and optional native simulator adapters. Each channel should carry its source, units, timestamps, availability, validity, and measured/derived status. Keep capture callbacks short; queue logging/export work outside them. Export selected run channels and a versioned manifest rather than all raw properties.

Keep garage constraints, measured calibration results, and inferred model parameters separate, tied to simulator/build/car/track/setup identity. Build the first iRacing capability audit before choosing calculations that depend on specific engineering channels. Where validated SimHub coverage is insufficient, evaluate native iRacing telemetry as a separate adapter; its additional coverage was not established by this SimHub-only research. Run logging, calibration exports, web synchronization, and the stable interchange format remain product implementation work.
