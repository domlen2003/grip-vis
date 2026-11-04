# Le Mans Ultimate: later-adapter and video reference

Research saved: 2026-10-30.

## Scope and status

The current product direction is **simulator-independent, with iRacing as the first adapter**. This document preserves earlier Le Mans Ultimate (LMU) research as a possible later-adapter reference. It does not establish LMU as the first implementation target, and it does not imply that its interfaces or physics signals also exist in iRacing.

The original reference was SimRacing Arnout's video, [How Grip Actually Works in Le Mans Ultimate](https://www.youtube.com/watch?v=FNRnetRNOn4) (19:34). This note covers independently checked telemetry interfaces and feasibility. It is not a transcript or verification of every claim in the video.

## Native telemetry recording

LMU 1.2 introduced native in-game telemetry recording to DuckDB. Recording can start automatically through gameplay settings or through a mapped control. Channels and their recording frequencies are configurable in `UserData/Telemetry/config.json`.

The official example includes suspension position; front/rear ride height and third-spring deflection; front downforce and drag; wheel speed; yaw rate; acceleration; steering; tyre temperatures, pressures and wear; and ABS/TC events. Many chassis channels default to 100 Hz, while temperatures, wear and environmental channels use differing rates. Increasing rates can affect performance.

The published example does **not** list individual tyre force, tyre load or grip channels. Its rear-downforce entry is named `ReadDownForce`; inspect actual file schemas before deciding whether that is a documentation typo, a historical name or the current recorded channel name. Studio 397 permits conversion to other formats but does not directly support the conversion feature.

Sources:

- [Official telemetry recording guide and example channel configuration](https://guide.lemansultimate.com/hc/en-gb/articles/14524956311695-Telemetry-Recording)
- [Official LMU 1.2 announcement](https://lemansultimate.com/le-mans-ultimate-releases-v1-2-update-with-huge-feature-list-and-latest-elms-content/)

## Native shared memory: schema versus available values

TinyPedal's maintained `pyLMUSharedMemory` library maps S397's shared-memory header, distributed with LMU in `Support\SharedMemoryInterface`. The mapping name is `LMU_Data`.

Its schema declares per-wheel suspension deflection, pushrod load, ride height, rotation, contact-patch and ground velocities, camber, longitudinal/lateral force, tyre load, pressure, temperature, wear and grip fraction. Vehicle fields include accelerations, rotation, ride heights, drag and front/rear downforce. It also declares TC, ABS, engine-map, brake-migration and anti-roll-bar settings.

These declarations prove **the interface has fields**, not that every current vehicle and session supplies useful measurements in them. Each channel must be checked against the actual game build, car and recording mode.

The schema describes `mGripFract` as an approximation of the fraction of the contact patch that is sliding. **It is not the fraction of grip remaining.** The schema also warns that tyre wear is not necessarily proportional to grip loss. Temperature arrays are left/centre/right, which requires side-aware mapping before calling them inside/centre/outside.

Sources:

- [TinyPedal shared-memory library and provenance](https://github.com/TinyPedal/pyLMUSharedMemory)
- [Maintainer channel definitions and comments](https://github.com/TinyPedal/pyLMUSharedMemory/blob/master/lmu_data.py)

## Population and access limitations

LMUFFB's maintainer issue discusses encrypted-car channels such as `mTireLoad` and `mGripFract` returning zero, with fallback approximation required. A separate issue reports zero raw tyre values for the AMG GT3. These are maintainer/community observations, **not an official guarantee about which channels are suppressed in every current LMU car**. They are sufficient reason not to promise direct per-wheel force/load/grip analysis based on the header alone.

Current LMU Pitwall reads native `LMU_Data` without the older rFactor 2 shared-memory DLL. Its maintainer describes 100 Hz telemetry and 5 Hz scoring, reports that the gameplay “Enable Plugins” switch governs the native mapping, and also uses LMU's local REST API for strategy and vehicle-condition information. These are useful implementation references; validate them on the installed build. Older tutorials requiring the rF2 plugin should not automatically define a new adapter.

Sources:

- [LMUFFB maintainer discussion of unavailable/encrypted channels, issue 384](https://github.com/coasting-nc/LMUFFB/issues/384)
- [AMG raw-data report, issue 579](https://github.com/coasting-nc/LMUFFB/issues/579)
- [LMU Pitwall's native-memory and REST integration](https://github.com/Swizzjack/lmu-pitwall)
- [Legacy rF2 shared-memory plugin](https://github.com/TheIronWolfModding/rF2SharedMemoryMapPlugin)

## Setup evidence

Real `.svm` files contain per-corner camber, pressure, spring, packer, ride-height and damper settings. They can distinguish a stored setting index from a commented display value: for example, `RideHeightSetting=25//7.5 cm`. Preserve the original file and both representations; do not interpret a raw index as a physical unit or assume the most recently saved file is necessarily the active setup.

Source: [Example LMU setup file](https://github.com/seralaci/Le-Mans-Ultimate-Setups/blob/main/Fuji/SRA%20BMW%20M4%20High%20DF%20LVL%204.5.svm).

## Realistic analysis, conditional on validated inputs

The following are feasibility inferences from the documented channels, not claims that a prototype has already been validated:

- Distance-aligned lap and driver comparisons, including braking, rotation and traction phases.
- Tyre-temperature and pressure evolution, and wear versus pace over a stint.
- Ride-height, rake and suspension-travel distributions; damper-velocity distributions derived from position with appropriate filtering.
- Aero balance versus speed and ride height when meaningful downforce channels are populated.
- Controlled setup A/B experiments, matching fuel, tyre age, weather, track conditions and driver as closely as possible.

Do not promise a complete tyre friction surface, exact combined-slip reserve, authoritative load-sensitivity curves, a complete aero map or a universally optimal setup. Realized forces, even if available, do not reveal the maximum force possible under unvisited conditions. Remaining grip would be a model estimate with stated assumptions and confidence.

## Required sample-data audit before an LMU adapter

Obtain representative native DuckDB recordings, native shared-memory captures and the corresponding setups from the team's actual cars and current game build. Audit field names, units, timestamps, effective sample rates, missing/constant/zero values and physical plausibility. Exercise normal cornering, braking, traction loss, kerbs, low/high speed and session transitions; check whether channels change with car, session mode or build.

Record per-channel provenance and availability. Treat absent data as unavailable rather than measured zero. Separate raw measurements, derived quantities and model estimates. Only then decide which analyses the LMU adapter can support and which grip/load claims need to remain estimates. This audit is still outstanding.
