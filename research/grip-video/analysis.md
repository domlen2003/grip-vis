# Video reference analysis

Source: [YouTube video FNRnetRNOn4](https://www.youtube.com/watch?v=FNRnetRNOn4). This note records evidence from the original working archive, including its transcript and inspected frames. The raw archive is not distributed here. The transcript is automatically generated and includes transcription errors.

## What the video demonstrates

- [3:25](https://www.youtube.com/watch?v=FNRnetRNOn4&t=205s) — An input demo with speed, throttle, brake, front brake bias, and steering-wheel controls; front/rear ride height; three spring and ARB settings per axle; and three rear-wing settings. Four corner circles/dots surround a chassis/aero-platform view with spring/packer graphics, corner heights, heave, steering direction, gear, and ABS/TC indicators. The screen identifies the demo as disconnected from LMU and labels its heights as model values. [Source video at this time](https://www.youtube.com/watch?v=FNRnetRNOn4&t=205s).
- [7:30](https://www.youtube.com/watch?v=FNRnetRNOn4&t=450s) — Changing suspension settings alters the illustrated circle sizes and balance. Orange represents mechanical/loading contributions; blue represents the aero addition. [Source video at this time](https://www.youtube.com/watch?v=FNRnetRNOn4&t=450s).
- [10:50](https://www.youtube.com/watch?v=FNRnetRNOn4&t=650s) — An example with 80% brake and 70% front brake bias puts front dots outside the circles, illustrating front demand exceeding the model's capacity. [Source video at this time](https://www.youtube.com/watch?v=FNRnetRNOn4&t=650s).
- [15:41](https://www.youtube.com/watch?v=FNRnetRNOn4&t=941s) — A live LMU overlay with car/speed identification, opacity, size, Lock, Hide, and Quit controls. Corner heights carry LMU labels, while tyre readouts use lateral degrees and longitudinal percentages. [Source video at this time](https://www.youtube.com/watch?v=FNRnetRNOn4&t=941s).
- [16:28](https://www.youtube.com/watch?v=FNRnetRNOn4&t=988s) — The presenter attributes oscillating dots during braking to ABS operation. This is a visual interpretation, not a demonstrated measurement of individual tyre forces. [Source video at this time](https://www.youtube.com/watch?v=FNRnetRNOn4&t=988s).

## Slip reference versus force utilisation

The live view uses slip-related quantities. At 15:41, for example, the front-left readout is LAT 6.2 degrees / LONG 0.2%. The embedded live panel visible in the earlier demo says that dots follow tyre velocities continuously and describes the circle as an **“8 deg / 12% reference, not measured peak grip.”**

The grip-budget metaphor in the explanation therefore does not establish that the live overlay measures force utilisation. A dot crossing a fixed slip-reference boundary does not, by itself, prove that a tyre has exhausted its available friction capacity. The video does not disclose enough implementation detail to reconstruct its exact slip-to-dot mapping.

## Explicit limitations and missing evidence

- [4:47](https://www.youtube.com/watch?v=FNRnetRNOn4&t=287s) — Calibration remains necessary; TC is inactive in the demo.
- [8:38](https://www.youtube.com/watch?v=FNRnetRNOn4&t=518s) and [11:15](https://www.youtube.com/watch?v=FNRnetRNOn4&t=675s) — The presenter qualifies the setup examples as illustrative/subjective rather than universal physics.
- [14:39–14:58](https://www.youtube.com/watch?v=FNRnetRNOn4&t=879s) — Live balancing remains unfinished; the model does not yet include the cold-tyre grip effect being discussed.
- [18:04–18:16](https://www.youtube.com/watch?v=FNRnetRNOn4&t=1084s) — The presenter says the control-loss boundary needs more accurate calibration.

No source code, tyre-force equations, friction coefficients, load-sensitivity curves, aero maps, differential equations, filters, exact slip calculations, thresholds, or vehicle-specific calibration are established by the video. It supports qualitative visual relationships and live signal movement, not a validated quantitative simulator. In particular, the illustrated suspension-to-circle response should not be copied as a proven physical law.

## Implications for an iRacing-first, cross-simulator project — our inference

These are design conclusions from the evidence, not claims made by the video:

- Preserve the useful four-corner visual and setup-learning workflow, while naming every plotted quantity and its units.
- Treat simulator adapters as capability-dependent. Verify iRacing's available channels before choosing a per-wheel display; show unavailable quantities explicitly rather than fabricating forces or slip.
- Separate measured channels, derived estimates, and educational model outputs in the interface and saved data.
- A slip plot can be useful without claiming a true grip limit. Describe reference boundaries and calibration status, and avoid a universal red-dot-equals-loss-of-control rule.
- Reserve force-utilisation language for a model supported by suitable force/load channels and validated capacity estimates. Temperature, tyre condition, vehicle, and operating state would need to inform any credible limit estimate.
- A cross-simulator comparison needs documented definitions, coordinate conventions, units, and calibration. Matching the visual scale alone does not make values physically comparable.
