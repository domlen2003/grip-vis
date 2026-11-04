import test from 'node:test';
import assert from 'node:assert/strict';
import * as diagram from '../src/lib/diagram.js';
import { evaluate, DEFAULT_SETUP } from '../src/lib/model.js';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `Expected ${actual} to be within ${tolerance} of ${expected}`,
);
const drawing = (name) => {
  assert.equal(typeof diagram[name], 'function', `${name} must be exported`);
  return diagram[name];
};
const maneuver = (inputs) => evaluate(DEFAULT_SETUP, {
  speed: 100, throttle: 0, brake: 0, steering: 0, ...inputs,
});

// Road → tyre and tyre → road act on different bodies: OpenStax, Newton's Third Law.
// https://openstax.org/books/university-physics-volume-1/pages/5-5-newtons-third-law
// These are vehicle-axis force demands, not passenger inertial tendency or a G-meter.

// Catches a longitudinal inversion and accidentally attributing rear drive to the front.
test('drive plots forward/up on the driven rear wheels', () => {
  const plot = drawing('plotForce');
  const result = maneuver({ throttle: 70 });
  for (const wheel of result.wheels.slice(0, 2)) near(plot(wheel, 65).y, 0);
  for (const wheel of result.wheels.slice(2)) {
    assert.ok(plot(wheel, 65).y < 0);
    near(plot(wheel, 65).x, 0);
  }
});

// Catches applying SVG's downward-positive axis as a forward-force axis.
test('braking plots rearward/down at all four tyres', () => {
  const plot = drawing('plotForce');
  for (const wheel of maneuver({ brake: 50 }).wheels) {
    assert.ok(plot(wheel, 65).y > 0);
    near(plot(wheel, 65).x, 0);
  }
});

// Catches plotting outward passenger tendency instead of the inward cornering demand.
test('right and left cornering plot toward the corresponding vehicle side', () => {
  const plot = drawing('plotForce');
  const right = maneuver({ steering: 12 });
  const left = maneuver({ steering: -12 });
  for (const [a, b] of [[0, 1], [1, 0], [2, 3], [3, 2]]) {
    assert.ok(plot(right.wheels[a], 65).x > 0);
    assert.ok(plot(left.wheels[b], 65).x < 0);
    near(plot(right.wheels[a], 65).x, -plot(left.wheels[b], 65).x);
    near(plot(right.wheels[a], 65).y, 0);
  }
});

// Catches inverting only one component or changing magnitude when switching observer.
test('road reaction reverses the combined demand without changing its magnitude', () => {
  const plot = drawing('plotForce');
  const wheel = maneuver({ brake: 55, steering: 12 }).wheels[0];
  const onTyre = plot(wheel, 65);
  const onRoad = plot(wheel, 65, 'tyre-on-road');
  assert.ok(onTyre.x > 0 && onTyre.y > 0);
  near(onRoad.x, -onTyre.x);
  near(onRoad.y, -onTyre.y);
  near(onRoad.rawX, -onTyre.rawX);
  near(onRoad.rawY, -onTyre.rawY);
  near(Math.hypot(onRoad.x, onRoad.y), Math.hypot(onTyre.x, onTyre.y));
});

// Catches independently clamping components, which bends an over-limit demand vector.
test('over-limit plot clipping preserves direction and retains the raw demand', () => {
  const result = drawing('plotForce')({ fxN: -4000, fyN: 3000, capacityN: 1000 }, 65);
  assert.equal(result.clipped, true);
  near(Math.hypot(result.x, result.y), 92);
  near(result.x / result.y, 0.75);
  near(result.rawX, 195);
  near(result.rawY, 260);
  const inside = drawing('plotForce')({ fxN: 0, fyN: 1000, capacityN: 1000 }, 65);
  assert.equal(inside.clipped, false);
  near(inside.x, 65);
});

// Catches the old fixed drawing limit hiding excessive demand inside an uncapped ring.
test('FL bump demand stays outside its capacity ring when the ring exceeds the old drawing limit', () => {
  const result = evaluate({ ...DEFAULT_SETUP, frontSpring: 240, wing: 0, brakeBias: 70 },
    { speed: 290, steering: 120, throttle: 0, brake: 100 }, { elapsed: 0, height: 18 });
  const wheel = result.wheels.find((candidate) => candidate.id === 'FL');
  const radius = drawing('envelopeRadius')(wheel.capacityN);
  const plot = drawing('plotForce');
  assert.ok(radius > 92);
  assert.ok(wheel.utilization > 1);
  const point = plot(wheel, radius);
  assert.ok(Math.hypot(point.x, point.y) > radius, 'Excessive demand must remain outside its capacity ring');
  assert.equal(point.clipped, false);
  near(point.rawX, wheel.fyN * radius / wheel.capacityN);
  near(point.rawY, -wheel.fxN * radius / wheel.capacityN);

  const excessive = plot({ ...wheel, fxN: wheel.fxN * 3, fyN: wheel.fyN * 3 }, radius);
  assert.equal(excessive.clipped, true);
  near(Math.hypot(excessive.x, excessive.y), radius + 12);
  near(excessive.x / excessive.y, point.rawX / point.rawY);
  near(excessive.rawX, point.rawX * 3);
  near(excessive.rawY, point.rawY * 3);
});

// Catches force plotting dividing by zero or propagating an invalid imported value.
test('force plotting safely handles zero capacity and missing or nonfinite data', () => {
  const plot = drawing('plotForce');
  const unloaded = plot({ fxN: -1, fyN: 0, capacityN: 0 }, 65);
  near(unloaded.y, 65);
  for (const wheel of [undefined, {}, { fxN: NaN, fyN: Infinity, capacityN: NaN }]) {
    const point = plot(wheel, 65);
    near(point.x, 0);
    near(point.y, 0);
    assert.equal(point.clipped, false);
  }
});

// Catches using net acceleration (including aerodynamic drag) as tyre contact force.
test('coasting can have zero tyre-force dots while drag decelerates the car', () => {
  const plot = drawing('plotForce');
  const result = maneuver({});
  assert.ok(result.metrics.dragN > 0 && result.metrics.axG < 0);
  for (const wheel of result.wheels) {
    near(plot(wheel, 65).x, 0);
    near(plot(wheel, 65).y, 0);
  }
});

// Catches confusing Three's up axis with longitudinal force or its rearward +Z.
test('3D combined forces point toward the same vehicle directions as the 2D plot', () => {
  const world = drawing('forceToWorld')(2000, 1000);
  near(world.x, 1000);
  near(world.y, 0);
  near(world.z, -2000);
  const reaction = drawing('forceToWorld')(2000, 1000, 'tyre-on-road');
  for (const axis of ['x', 'y', 'z']) near(world[axis] + reaction[axis], 0);
});

// Catches front wheels steering left in Three when positive input means right.
test('right steering turns right in SVG and rotates the 3D forward direction toward right', () => {
  const svg = drawing('frontWheelAngle');
  const rotation = drawing('frontWheelRotationY');
  near(svg(28), 2);
  near(svg(-28), -2);
  assert.ok(rotation(28) < 0);
  assert.ok(-Math.sin(rotation(28)) > 0, 'The -Z forward vector must acquire positive X');
  near(rotation(-28), -rotation(28));
  near(svg(10000), svg(120));
  near(svg(-10000), svg(-120));
  near(svg(NaN), 0);
  near(rotation(Infinity), 0);
});

test('visual wheel steering is deliberately stronger while physical wheel angles stay unchanged', () => {
  const visual = drawing('visualWheelAngle');
  const physical = drawing('frontWheelAngle');
  const world = drawing('visualWheelRotationY');
  near(physical(28), 2);
  assert.ok(visual(20) >= 18 && visual(20) <= 20);
  near(visual(120), 40);
  near(visual(-120), -40);
  near(visual(1000), 40);
  near(visual(-1000), -40);
  near(visual(0), 0);
  near(visual(NaN), 0);
  near(visual(Infinity), 0);
  for (const input of [1, 12, 20, 60, 120]) {
    near(visual(input), -visual(-input));
    near(world(input), -visual(input) * Math.PI / 180);
  }
});

// Catches an individual wheel hitting a drawing ceiling while other wheels catch up.
test('capacity ring area follows a shared uncapped scale through and beyond the slider range', () => {
  const radius = drawing('envelopeRadius');
  near(radius(4350), 50);
  near(radius(0), 0);
  near(radius(-100), 0);
  assert.ok(radius(1e12) > radius(1e6));
  near(radius(17400) ** 2 / radius(4350) ** 2, 4);
  assert.ok(radius(11000) > radius(10500));
  assert.ok(radius(3000) < radius(4350));
  assert.ok(Number.isFinite(radius(NaN)));
});

// Catches corner rotation or unconstrained cue motion projecting outside the car.
test('the qualitative aero box stays inside the car at all extreme metric combinations', () => {
  const boxFor = drawing('aeroBox');
  assert.ok(diagram.CAR_INNER_BOUNDS, 'Car interior bounds must be exported');
  const bounds = diagram.CAR_INNER_BOUNDS;
  for (const rollDeg of [-1e6, 0, 1e6]) {
    for (const pitchDeg of [-1e6, 0, 1e6]) {
      for (const frontAeroPct of [-1e6, 43, 1e6]) {
        const box = boxFor({ rollDeg, pitchDeg, frontAeroPct });
        assert.ok(box.x >= bounds.left && box.x + box.width <= bounds.right);
        // The GT outline has a narrower waist than its axle/fender region.
        assert.ok(box.x >= 294 && box.x + box.width <= 386, 'Cue must clear the GT silhouette waist');
        assert.ok(box.y >= bounds.top && box.y + box.height <= bounds.bottom);
        near(box.width, 56);
        near(box.height, 80);
        near(box.cx, box.x + box.width / 2);
        near(box.cy, box.y + box.height / 2);
        near(box.dx, box.cx - diagram.CHASSIS.centerX);
        near(box.dx, -9 * Math.tanh(rollDeg / 1.2));
        near(box.dy, 22 * Math.tanh((43 - frontAeroPct) / 12 - pitchDeg * 2));
        assert.equal('rotation' in box, false);
        assert.equal(box.corners.length, 4);
        for (const [x, y] of box.corners) {
          assert.ok(Number.isFinite(x) && Number.isFinite(y));
          assert.ok(x >= bounds.left && x <= bounds.right);
          assert.ok(y >= bounds.top && y <= bounds.bottom);
        }
        near(box.pivot.x, box.cx);
        near(box.pivot.y, box.cy);
        assert.ok(Math.abs(box.pitchAngle) <= 24 && Math.abs(box.rollAngle) <= 24);
        assert.match(box.path, /^M.+Q.+Z$/);
      }
    }
  }
});

// Catches braking pitch shifting a platform cue rearward or acceleration forward.
test('braking shifts the aero cue forward relative to acceleration', () => {
  const boxFor = drawing('aeroBox');
  const braking = boxFor(maneuver({ brake: 60 }).metrics);
  const accelerating = boxFor(maneuver({ throttle: 100 }).metrics);
  assert.ok(braking.cy < accelerating.cy);
  assert.ok(braking.cy < 321.5);
  assert.ok(accelerating.cy > 321.5);
});

// Catches a platform cue that translates but never visibly pivots around its centre.
test('roll and pitch pivot the small aero cue without yawing the car or changing its base size', () => {
  const boxFor = drawing('aeroBox');
  const neutral = boxFor({ rollDeg: 0, pitchDeg: 0, frontAeroPct: 43 });
  const rolled = boxFor({ rollDeg: 1, pitchDeg: 0, frontAeroPct: 43 });
  assert.ok(rolled.cx < neutral.cx);
  near(rolled.cy, neutral.cy);
  near(rolled.width, neutral.width);
  near(rolled.height, neutral.height);
  near(neutral.pitchAngle, 0);
  near(neutral.rollAngle, 0);
  assert.ok(rolled.rollAngle > 0);
  assert.notDeepEqual(rolled.corners.map(([x, y]) => [x - rolled.cx, y - rolled.cy]),
    neutral.corners.map(([x, y]) => [x - neutral.cx, y - neutral.cy]));
  const pitched = boxFor({ pitchDeg: 0.2, rollDeg: 0, frontAeroPct: 43 });
  assert.ok(pitched.pitchAngle > 0);
  assert.notEqual(pitched.path, neutral.path);
  assert.equal('rotation' in rolled, false);
});

test('aero projection mirrors left and right platform motion and has a centred neutral pivot', () => {
  const boxFor = drawing('aeroBox');
  const left = boxFor({ rollDeg: -0.8, pitchDeg: 0.15, frontAeroPct: 43 });
  const right = boxFor({ rollDeg: 0.8, pitchDeg: 0.15, frontAeroPct: 43 });
  for (const [a, b] of [[0, 1], [1, 0], [2, 3], [3, 2]]) {
    near(left.corners[a][0] + right.corners[b][0], 2 * diagram.CHASSIS.centerX);
    near(left.corners[a][1], right.corners[b][1]);
  }
  const neutral = boxFor({});
  near(neutral.corners[0][0], neutral.cx - neutral.width / 2);
  near(neutral.corners[0][1], neutral.cy - neutral.height / 2);
  near(neutral.corners[2][0], neutral.cx + neutral.width / 2);
  near(neutral.corners[2][1], neutral.cy + neutral.height / 2);
});

test('ride heights and wing move the assumed aero cue throughout their ranges at fixed inputs', () => {
  const boxFor = drawing('aeroBox');
  for (const speed of [0, 60, 140, 260]) {
    for (const maneuver of [{ throttle: 0, brake: 0, steering: 0 }, { throttle: 15, brake: 35, steering: 12 }]) {
      const inputs = { speed, ...maneuver };
      const sweep = (key, values) => values.map((value) =>
        boxFor(evaluate({ ...DEFAULT_SETUP, [key]: value }, inputs).metrics));
      const front = sweep('frontRideHeight', [35, 45, 55, 65, 75, 85, 90]);
      const rear = sweep('rearRideHeight', [40, 50, 60, 70, 80, 90, 100, 110]);
      const wing = sweep('wing', Array.from({ length: 13 }, (_, index) => index));
      for (const [index, boxes] of [[0, front], [1, rear], [2, wing]]) {
        for (let step = 1; step < boxes.length; step++) {
          const change = boxes[step].cy - boxes[step - 1].cy;
          assert.ok(index === 1 ? change < -0.05 : change > (index === 2 ? 0.1 : 0.05),
            `${['front ride height', 'rear ride height', 'wing'][index]} at ${speed} km/h must keep moving before the endpoint`);
        }
      }
      assert.ok(front[0].pitchAngle > front.at(-1).pitchAngle, 'Raising the front tips the assumed platform nose-up');
      assert.ok(rear[0].pitchAngle < rear.at(-1).pitchAngle, 'Raising the rear tips the assumed platform nose-down');
    }
  }
});

// Catches undefined/NaN metrics poisoning SVG positions and making the diagram disappear.
test('missing and nonfinite aero metrics fall back to a finite centred cue', () => {
  const boxFor = drawing('aeroBox');
  for (const metrics of [undefined, null, {}, { rollDeg: NaN, pitchDeg: Infinity, frontAeroPct: -Infinity }]) {
    const box = boxFor(metrics);
    near(box.cx, 340);
    near(box.cy, 321.5);
    near(box.dx, 0);
    near(box.dy, 0);
    assert.ok(Object.values(box).filter((value) => typeof value === 'number').every(Number.isFinite));
    assert.ok(box.corners.flat().every(Number.isFinite));
    assert.doesNotMatch(box.path, /NaN|Infinity/);
  }
});

// Catches suspension endpoints following the moving aero cue or floating inside the chassis.
test('spring anchors stay on chassis edges and fixed while the aero cue moves', () => {
  const boxFor = drawing('aeroBox');
  assert.ok(diagram.CHASSIS && diagram.SPRING_ANCHORS && diagram.WHEEL_POSITIONS);
  const original = structuredClone(diagram.SPRING_ANCHORS);
  for (const [id, [x, y]] of Object.entries(diagram.SPRING_ANCHORS)) {
    assert.equal(x, id.endsWith('L') ? diagram.CHASSIS.left : diagram.CHASSIS.right);
    assert.ok(y > diagram.CHASSIS.top && y < diagram.CHASSIS.bottom);
    assert.ok(id.endsWith('L') ? diagram.WHEEL_POSITIONS[id][0] < x : diagram.WHEEL_POSITIONS[id][0] > x);
  }
  boxFor({ rollDeg: 90, pitchDeg: -90, frontAeroPct: 0 });
  boxFor({ rollDeg: -90, pitchDeg: 90, frontAeroPct: 100 });
  assert.deepEqual(diagram.SPRING_ANCHORS, original);
});

// Catches moving the spring endpoints to simulate compression, rather than changing its coils.
test('spring compression changes the coil shape while preserving fixed endpoints', () => {
  const pathFor = drawing('springPath');
  const relaxed = pathFor([150, 170], [264, 218], 0);
  const compressed = pathFor([150, 170], [264, 218], 25);
  assert.notEqual(compressed, relaxed);
  for (const path of [relaxed, compressed]) {
    const values = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
    assert.deepEqual(values.slice(0, 2), [150, 170]);
    assert.deepEqual(values.slice(-2), [264, 218]);
    assert.ok(values.every(Number.isFinite));
  }
  assert.doesNotMatch(pathFor([1, 1], [1, 1], 20), /NaN|Infinity/);
});
