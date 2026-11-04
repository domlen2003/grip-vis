# Setup-building process reference

Source: [How I Build Every GT3 Car Setup in LMU V1.4 (3-Step System)](https://www.youtube.com/watch?v=JiVMUyE6aYU), SimRacing Arnout, published 2026-03-19; 21:53. The original workspace retained the full video; this code repository includes only notes and source links; this note is based on three inspected frames and the complete uncorrected English auto-captions in the source video transcript. Technical wording and numbers may contain caption errors.

## Demonstration context

- **Simulator/version:** Le Mans Ultimate; **V1.4 is stated in the title**, rather than independently confirmed from a build screen.
- **Car/track:** Aston Martin GT3 at Spa-Francorchamps. The exact car model/year is not established by the inspected material.
- **Conditions:** author specifies “light” grip at 01:05 and later calls it “low” grip; 20 degrees, without clearly distinguishing air from track temperature; 50% fuel for the comparison runs. Tire warmers are enabled and flag rules disabled (03:40). Consistent conditions are an explicit goal, but a complete session configuration is not supplied.

## Source-derived summary

At **00:39**, the author proposes “one change, one expected result.” His demonstration has three named stages, with additional adjustments between them. **01:12–10:38: exploration** compares high, low, and intermediate rear-wing baselines, pairing each with rear ride-height changes. Eau Rouge/Raidillon and Blanchimont provide high-speed balance checks; safe passage matters before outright lap time. He drives at roughly 85% effort and retains variants for other tracks.

**10:40–17:28: build on the intermediate-wing baseline.** Pouhon becomes a stability constraint while front springs, anti-roll bars, or front packers are considered. This Aston permits further front softening; he also lowers traction control. His selected example has 8° wing and approximately 7 cm rear ride height (**13:44**).

**17:29–21:07: seek lap time and earlier throttle.** Rear packers and reduced rear toe-in add rotation while he checks that the earlier safety targets survive. He explicitly says packer response varies by car (**19:35**). The final demonstrated pace is around 2:19; projected qualifying/race times are estimates.

Transferable ideas are staged exploration, named corner targets, comparable conditions, saved baselines, driver feedback, and iterative testing. The demonstrated settings remain specific to this car, simulator version, driver, and conditions.

## Limits and claims to retain as author-specific

The presentation does **not** establish isolated causal effects: wing and ride height change together; rear suspension and front height are also changed during exploration (**05:43–07:59**); front springs and TC change together later. The author acknowledges improved corner execution (**16:18**) and repeated attempts (**20:01**). A small delta or one lap therefore cannot prove a setup gain.

“Lowest” pressures/camber (**15:57**), minimum front height and soft suspension “at the moment” (**06:28**), and the claim that earlier throttle always improves lap time (**17:48**) are contextual advice or broad simplifications, not cross-simulator rules. The “aerobox” is explicitly an explanatory model (**02:55**), not a supplied aero map. Neither flat-out target corners nor the exact settings should become universal acceptance criteria. The video does name three stages; the valuable structure is their goals and constraints, rather than a rigid three-change recipe.

## Implications for the proposed team tool — inference

Represent each experiment as a baseline, hypothesis, target corner/phase, actual parameter changes, expected effect, observed effect, and keep/revert decision. Support grouped changes while visibly preserving that grouping; do not report a single parameter as the proven cause. Record driver, simulator/build, car variant, track layout, temperatures, grip, fuel, tires, assists, and run/lap evidence so comparisons are interpretable. Preserve high/medium/low variants and their ancestry for team reuse. An AI engineering skill could recommend the next bounded experiment and its stability checks, then ask for observations and telemetry; simulator/car adapters must supply parameter names, limits, and effects, beginning with iRacing rather than copying LMU values.

## Referenced video positions

- [01:30 — exploration: setup screen with 11° rear wing](https://www.youtube.com/watch?v=JiVMUyE6aYU&t=90s).
- [13:30 — stage 2: author's front-packer/aero-balance explanatory diagram](https://www.youtube.com/watch?v=JiVMUyE6aYU&t=810s).
- [17:50 — stage 3: rear-packer diagram and intermediate rear wing](https://www.youtube.com/watch?v=JiVMUyE6aYU&t=1070s).
