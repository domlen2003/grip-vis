# Setup Lab force conventions

These conventions apply to the local illustrative application in the repository root. They define the meaning of its dots and arrows; they do not validate its fictional force capacity, calibrate a car, or turn its requested forces into telemetry.

## Body and axes

The primary diagram shows **requested road-on-tyre force**, expressed in vehicle axes. Vehicle forward is `+Fx`; the driver's right is `+Fy`. Positive steering requests a right turn. The front of the car points up on the page, so SVG coordinates use:

```text
screen x = centre x + scale × Fy
screen y = centre y − scale × Fx
```

The shorthand is `(Fy, -Fx)`, with a positive drawing scale. The force components are already in vehicle axes and are not rotated again when the front-wheel graphic steers.

| Requested road-on-tyre force | Model sign | Direction on the primary diagram |
| --- | --- | --- |
| Forward drive at a driven rear tyre | `Fx > 0` | Up |
| Braking | `Fx < 0` | Down |
| Force into a right turn | `Fy > 0` | Right |
| Force into a left turn | `Fy < 0` | Left |
| Braking into a right turn | `Fx < 0`, `Fy > 0` | Down and right |

This is the project's chosen coordinate convention. [MathWorks' Longitudinal Wheel documentation](https://www.mathworks.com/help/vdynblks/ref/longitudinalwheel.html) provides a useful explicit example of defining `Fx` as longitudinal force acting on the tyre at the contact point. The Setup Lab evaluator is its own illustrative algebraic model; it does not implement that block or its Magic Formula tyre model.

In the Three.js scenes, world `+X` is vehicle right, `+Y` is up and vehicle forward is `-Z`. A vehicle-axis contact vector therefore becomes `(Fy, 0, -Fx)`. The 3D view and SVG preserve the same vehicle directions even when the camera orbits.

## Equal and opposite forces

The road's force on the tyre and the tyre's force on the road are equal in magnitude and opposite in direction. They act on different bodies, so they are not two cancelling forces on the car. This distinction follows [Newton's third law as explained by OpenStax](https://openstax.org/books/university-physics-volume-1/pages/5-5-newtons-third-law).

The tyre-force popup labels cyan as **Road → tyre** and coral as **Tyre → road**. Selecting the opposite observer negates both components:

```text
F(tyre on road) = −F(road on tyre)
```

The primary diagram retains the road-on-tyre observer. During a right turn its requested contact force points right, into the turn. A passenger's outward inertial tendency is a different concept. An apparent inertial force introduced in an accelerating vehicle frame would need a separate label and definition; it is not the tyre-on-road reaction force.

## Demand, capacity and acceleration

The dots are requested contact forces evaluated from manual, synthetic or imported driver controls. The rings are an assumed load-sensitive capacity. Even recorded controls do not make the evaluated tyre forces measured data. Demand can exceed capacity without the model solving the resulting slip, trajectory or actual delivered force. “Model usage” is their ratio, not measured grip consumed or reserve remaining.

Capacity has no model ceiling. Every mechanical, total and pinned-baseline ring uses the fixed area scale `radius = 50 × sqrt(capacityN / 4350)` in SVG units. The former 80-unit drawing cap is removed; there is no per-tyre ceiling or automatic rescaling. Area is proportional to capacity. Numeric total/natural/aero capacity in kN is primary, with normal load and demand ratio secondary.

The dashed “natural” ring is `mechanicalCapacityN`: a second evaluation at the same speed, setup, controls and bump state with vertical downforce removed while aero drag remains. It is not a stationary-car reference. The total outline is `capacityN`, and the signed contribution is exactly `aeroCapacityN = capacityN - mechanicalCapacityN` after the nonlinear capacity calculation. The annulus between the two rings shows that contribution on the same area scale. A negative contribution appears coral, with the total ring inside the mechanical ring. The bump's donor-limited redistribution can cause this negative comparison; it is a heuristic artifact, not a validated real-car aero effect.

Large plot vectors are clipped radially to keep them readable. Clipping preserves direction and leaves the numerical usage calculation unchanged; a dot's distance after clipping is not an exact force magnitude.

Net vehicle acceleration also includes forces beyond the plotted tyre demands. For example, the illustrative car can coast with zero tyre-force dots while assumed aerodynamic drag decelerates it. The longitudinal demand/acceleration readout and a tyre dot therefore need not have identical signs or magnitudes.

Following the user's correction, the fixed exterior is one continuous Ferrari 296 GT3 perimeter hand-traced from the true overhead VELOREX team render; see the [outline references](../research/car-outline/README.md). There is no additional chassis rectangle or panel line. Springs attach to the perimeter. The visual reference does not calibrate the generic model.

Wheel graphics exaggerate steering nonlinearly to ±40° (about 18.6° at 20° input); the physical model and road-wheel readout retain the 14:1 ratio. The 56 × 80 inner aero platform translates and shows projected pitch/roll about a visible pivot while the perimeter stays fixed. Total dynamic rake and roll drive tilt; rake/wing/front-aero balance and driving pitch affect translation. The 3D aero popup uses one smaller platform inside the wireframe at fixed centre height `Y = 1.03`, with local tilt controls up to ±24°. These cues are not a measured centre of pressure or car pose, and the three-second bump pulse is not a tyre-contact or suspension solver. Keep these limits visible when adding observed-data or calibrated-model modes.

## Regression coverage

`tests/diagram.test.js` covers drive/brake and cornering signs, reversal of both reaction components, direction-preserving clipping, the coasting/drag distinction, agreement between SVG and 3D axes, capacity-ring area scale, physical/visual steering, aero-platform projection/bounds and fixed spring attachments. `tests/model.test.js` covers model invariants, exact signed capacity decomposition, finite scenario sampling and import/session contracts. Run `npm test` from the repository root; see the [verification record](../verification.md) for actual counts, results and browser evidence.
