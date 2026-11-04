import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/lib/model.js';

const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
const near = (actual, expected, tolerance = 1e-8) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `Expected ${actual} to be within ${tolerance} of ${expected}`,
);
const evaluate = (setup = {}, inputs = {}, transient) => {
  assert.equal(typeof model.evaluate, 'function', 'The pure evaluator must be exported');
  return model.evaluate({ ...model.DEFAULT_SETUP, ...setup }, { ...model.DEFAULT_INPUTS, ...inputs }, transient);
};
const assertFinite = (value, path = 'result') => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path} must be finite`);
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) assertFinite(item, `${path}.${key}`);
  }
};
const scenarioFixture = () => ({
  kind: 'setup-lab-scenario', schemaVersion: 1, title: 'Synthetic brake and release example',
  source: { kind: 'synthetic', notes: 'Hand-authored control trace; not a recorded lap.' },
  samples: [
    { time: 0, speed: 160, throttle: 30, brake: 0, steering: 0, phase: 'Approach' },
    { time: 2, speed: 140, throttle: 0, brake: 70, steering: 5, phase: 'Braking' },
    { time: 4, speed: 100, throttle: 0, brake: 10, steering: 25, phase: 'Apex' },
    { time: 8, speed: 150, throttle: 85, brake: 0, steering: 2, phase: 'Exit' },
  ],
});

// Catches steering producing force at rest without vehicle motion.
test('zero speed creates no aerodynamic or lateral demand even with steering', () => {
  const result = evaluate({}, { speed: 0, throttle: 0, brake: 0, steering: 120 });
  near(result.metrics.ayG, 0);
  near(result.metrics.downforceN, 0);
  near(result.metrics.dragN, 0);
  for (const wheel of result.wheels) near(wheel.fyN, 0);
  near(sum(result.wheels, 'loadN'), 1250 * 9.81);
});

// Catches incorrect transfer signs or a left/right numerical bias.
test('straight loads are symmetric and reversing steering mirrors the wheel result', () => {
  const straight = evaluate({}, { steering: 0, throttle: 0, brake: 0 });
  near(straight.wheels[0].loadN, straight.wheels[1].loadN);
  near(straight.wheels[2].loadN, straight.wheels[3].loadN);
  const right = evaluate({}, { steering: 30 });
  const left = evaluate({}, { steering: -30 });
  for (const [a, b] of [[0, 1], [1, 0], [2, 3], [3, 2]]) {
    near(right.wheels[a].loadN, left.wheels[b].loadN);
    near(right.wheels[a].fxN, left.wheels[b].fxN);
    near(right.wheels[a].fyN, -left.wheels[b].fyN);
    near(right.wheels[a].utilization, left.wheels[b].utilization);
  }
  assert.ok(right.wheels[0].loadN > right.wheels[1].loadN);
  assert.ok(right.wheels[2].loadN > right.wheels[3].loadN);
  assert.ok(right.wheels.every((wheel) => wheel.fyN > 0));
  near(right.metrics.ayG, -left.metrics.ayG);
});

// Catches accidental double counting of aerodynamic normal force and bump load.
test('weight plus downforce is conserved during turning, braking and the bump pulse', () => {
  for (const elapsed of [Infinity, 0, 0.1, 0.4, 1, 4]) {
    const result = evaluate({}, { speed: 240, steering: 80, brake: 100, throttle: 0 }, { elapsed, height: 35 });
    near(sum(result.wheels, 'loadN'), 1250 * 9.81 + result.metrics.downforceN);
    assert.ok(result.wheels.every((wheel) => wheel.loadN >= 0));
  }
});

// Catches brake bias changing requested total braking or applying throttle to the front.
test('brake bias redistributes the same brake demand and power drives the rear wheels', () => {
  const inputs = { speed: 120, throttle: 0, brake: 70, steering: 0 };
  const rearward = evaluate({ brakeBias: 45 }, inputs);
  const forward = evaluate({ brakeBias: 70 }, inputs);
  near(sum(rearward.wheels, 'fxN'), sum(forward.wheels, 'fxN'));
  assert.ok(forward.wheels[0].fxN < rearward.wheels[0].fxN);
  assert.ok(forward.wheels[2].fxN > rearward.wheels[2].fxN);
  const powered = evaluate({}, { speed: 100, throttle: 100, brake: 0, steering: 0 });
  near(powered.wheels[0].fxN, 0);
  near(powered.wheels[1].fxN, 0);
  assert.ok(powered.wheels[2].fxN > 0);
  assert.ok(powered.wheels[3].fxN > 0);
});

// Catches reversing the wing/downforce/drag relationship or introducing force at rest.
test('a higher wing increases downforce and drag at the same moving speed', () => {
  const low = evaluate({ wing: 0 }, { speed: 200, steering: 0 });
  const high = evaluate({ wing: 12 }, { speed: 200, steering: 0 });
  assert.ok(high.metrics.downforceN > low.metrics.downforceN);
  assert.ok(high.metrics.dragN > low.metrics.dragN);
});

// Capacity is unbounded by a grip ceiling: display layout must not create one.
test('assumed tyre capacities keep increasing through the entire wing range', () => {
  const inputs = { speed: 300, steering: 0, brake: 0, throttle: 0 };
  let previous = evaluate({ wing: 0 }, inputs);
  for (let wing = 1; wing <= 12; wing += 1) {
    const current = evaluate({ wing }, inputs);
    assert.ok(current.metrics.downforceN > previous.metrics.downforceN);
    for (let index = 0; index < current.wheels.length; index += 1) {
      assert.ok(current.wheels[index].capacityN > previous.wheels[index].capacityN,
        `${current.wheels[index].id} capacity must increase from wing ${wing - 1} to ${wing}`);
    }
    previous = current;
  }
  assert.ok(previous.wheels[2].capacityN > previous.wheels[0].capacityN,
    'Rear-biased aero remains rear-biased at maximum wing and speed');
});

test('maximum-wing capacities keep increasing to the final speed-slider increment', () => {
  const setup = { wing: 12 };
  let previous = evaluate(setup, { speed: 0, steering: 0, brake: 0, throttle: 0 });
  for (let speed = 1; speed <= 300; speed += 1) {
    const current = evaluate(setup, { speed, steering: 0, brake: 0, throttle: 0 });
    for (let index = 0; index < current.wheels.length; index += 1) {
      assert.ok(current.wheels[index].capacityN > previous.wheels[index].capacityN,
        `${current.wheels[index].id} capacity must increase from ${speed - 1} to ${speed} km/h`);
    }
    previous = current;
  }
});

test('zero-speed capacity is entirely mechanical with no vertical-aero contribution', () => {
  const result = evaluate({ wing: 12 }, { speed: 0, throttle: 0, brake: 0, steering: 0 });
  for (const wheel of result.wheels) {
    near(wheel.mechanicalCapacityN, wheel.capacityN);
    near(wheel.aeroCapacityN, 0);
    near(wheel.mechanicalLoadN, wheel.loadN);
    near(wheel.aeroLoadN, 0);
  }
  near(result.metrics.totalMechanicalCapacityN, sum(result.wheels, 'capacityN'));
  near(result.metrics.totalAeroCapacityN, 0);
});

test('mechanical and signed aero contributions add back to the existing total', () => {
  for (const speed of [0, 120, 300]) for (const steering of [-80, 0, 80]) {
    for (const elapsed of [Infinity, 0, 0.1, 0.185]) {
      const result = evaluate({ wing: 12 }, { speed, steering, throttle: 0, brake: 65 }, { elapsed, height: 18 });
      for (const wheel of result.wheels) {
        assert.ok(wheel.mechanicalCapacityN >= 0);
        assert.ok(wheel.mechanicalLoadN >= 0);
        near(wheel.mechanicalCapacityN + wheel.aeroCapacityN, wheel.capacityN);
        near(wheel.mechanicalLoadN + wheel.aeroLoadN, wheel.loadN);
      }
      near(sum(result.wheels, 'mechanicalLoadN'), 1250 * 9.81);
      near(sum(result.wheels, 'aeroLoadN'), result.metrics.downforceN);
      near(result.metrics.totalMechanicalCapacityN, sum(result.wheels, 'mechanicalCapacityN'));
      near(result.metrics.totalAeroCapacityN, sum(result.wheels, 'aeroCapacityN'));
      near(result.metrics.totalCapacityN, sum(result.wheels, 'capacityN'));
      near(result.metrics.totalMechanicalCapacityN + result.metrics.totalAeroCapacityN, result.metrics.totalCapacityN);
    }
  }
});

test('mechanical baseline keeps the moving maneuver and drag rather than using a stopped car', () => {
  const moving = evaluate({ wing: 12 }, { speed: 240, steering: 0, throttle: 0, brake: 0 });
  const stopped = evaluate({ wing: 12 }, { speed: 0, steering: 0, throttle: 0, brake: 0 });
  const movingFront = sum(moving.wheels.slice(0, 2), 'mechanicalLoadN');
  const stoppedFront = sum(stopped.wheels.slice(0, 2), 'mechanicalLoadN');
  assert.ok(movingFront > stoppedFront, 'Drag-induced forward load transfer stays in the baseline');
  near(movingFront, 1250 * 9.81 * 0.48 + moving.metrics.dragN * 0.35 / 2.8);
  for (const wheel of moving.wheels) assert.ok(wheel.aeroCapacityN > 0);
  const turning = evaluate({ wing: 12 }, { speed: 120, steering: 12, throttle: 0, brake: 0 });
  assert.ok(turning.wheels[0].mechanicalLoadN > turning.wheels[1].mechanicalLoadN);
});

test('donor-limited bump attribution preserves a negative wheel contribution instead of clamping it', () => {
  const result = evaluate({ wing: 0 }, { speed: 150, steering: -120, throttle: 0, brake: 0 }, { elapsed: 0, height: 18 });
  const frontRight = result.wheels.find((wheel) => wheel.id === 'FR');
  near(frontRight.capacityN, 7885.607400737982);
  near(frontRight.mechanicalCapacityN, 7909.432316489297);
  near(frontRight.aeroCapacityN, -23.82491575131462);
  assert.ok(frontRight.aeroLoadN < 0);
  near(frontRight.mechanicalCapacityN + frontRight.aeroCapacityN, frontRight.capacityN);
  assert.ok(result.metrics.totalAeroCapacityN > 0);
});

// Catches negative loads, divide-by-zero capacities and unbounded transfer at extreme controls.
test('all bound combinations produce finite values and nonnegative normal loads', () => {
  assert.ok(Array.isArray(model.SETUP_FIELDS), 'Setup control metadata must be exported');
  for (const end of ['min', 'max']) {
    const setup = Object.fromEntries(model.SETUP_FIELDS.map((field) => [field.key, field[end]]));
    for (const speed of [0, 300]) for (const steering of [-120, 0, 120]) {
      const result = evaluate(setup, { speed, steering, throttle: 100, brake: 100 }, { elapsed: 0, height: 70 });
      assertFinite(result);
      assert.ok(result.wheels.every((wheel) => wheel.loadN >= 0 && wheel.capacityN >= 0 && wheel.utilization >= 0));
      near(sum(result.wheels, 'loadN'), 1250 * 9.81 + result.metrics.downforceN);
    }
  }
});

// Catches spring controls being cosmetic and travel limits failing to engage.
test('soft springs move the platform more and small travel engages a stop', () => {
  const inputs = { speed: 280, brake: 100, throttle: 0, steering: 25 };
  const soft = evaluate({ frontSpring: 60, frontTravel: 70 }, inputs);
  const stiff = evaluate({ frontSpring: 240, frontTravel: 70 }, inputs);
  assert.ok(soft.metrics.frontRideHeightMm < stiff.metrics.frontRideHeightMm);
  const limited = evaluate({ frontSpring: 60, frontTravel: 10 }, inputs);
  assert.ok(limited.wheels.some((wheel) => wheel.stopEngaged));
  assert.equal(limited.metrics.platformLimited, true);
});

// Catches a permanent bump offset or a damping control with no effect on recovery.
test('the front-left illustrative bump redistributes load and returns to the steady result', () => {
  const steady = evaluate({}, { speed: 100, steering: 0, brake: 0, throttle: 0 });
  const pulse = evaluate({}, { speed: 100, steering: 0, brake: 0, throttle: 0 }, { elapsed: 0, height: 18 });
  assert.ok(pulse.wheels[0].loadN > steady.wheels[0].loadN);
  near(sum(pulse.wheels, 'loadN'), sum(steady.wheels, 'loadN'));
  const recovered = evaluate({}, { speed: 100, steering: 0, brake: 0, throttle: 0 }, { elapsed: 4, height: 18 });
  assert.deepEqual(recovered, steady);
  const low = evaluate({ damping: 0 }, { steering: 0 }, { elapsed: 0.5, height: 18 });
  const high = evaluate({ damping: 100 }, { steering: 0 }, { elapsed: 0.5, height: 18 });
  const normal = evaluate({}, { steering: 0 });
  assert.ok(Math.abs(high.wheels[0].loadN - normal.wheels[0].loadN) < Math.abs(low.wheels[0].loadN - normal.wheels[0].loadN));
});

// Catches fixed presets masquerading as time-varying maneuver samples.
test('all named presets produce bounded finite maneuvers and hold their exact final controls', () => {
  assert.equal(typeof model.sampleScenario, 'function', 'Scenario sampler must be exported');
  assert.deepEqual(model.SCENARIOS.map((scenario) => scenario.id), ['manual', 'trail-braking', 'power-exit', 'fast-sweeper', 'daytona-chicane']);
  for (const id of ['trail-braking', 'power-exit', 'fast-sweeper', 'daytona-chicane']) {
    const first = model.sampleScenario(id, 0);
    const later = model.sampleScenario(id, 1.3);
    assert.notDeepEqual(first, later);
    for (const field of model.INPUT_FIELDS) {
      assert.ok(first[field.key] >= field.min && first[field.key] <= field.max);
      assert.ok(later[field.key] >= field.min && later[field.key] <= field.max);
    }
    const duration = model.scenarioDuration(id);
    assert.ok(duration > 0);
    const final = model.sampleScenario(id, duration);
    assert.deepEqual(model.sampleScenario(id, duration + 100), final);
    assert.deepEqual(model.sampleScenario(id, -1), first);
    assert.equal(model.scenarioPhase(id, duration), 'Exit complete');
  }
  assert.deepEqual(model.sampleScenario('manual', 10), model.DEFAULT_INPUTS);
  assert.equal(model.scenarioDuration('manual'), 0);
  assert.equal(model.scenarioPhase('manual', 10), 'Manual inputs');
});

test('trail braking contains a full corner and the synthetic chicane changes steering direction', () => {
  const approach = model.sampleScenario('trail-braking', 0);
  const braking = model.sampleScenario('trail-braking', 2.5);
  const apex = model.sampleScenario('trail-braking', 8);
  const exit = model.sampleScenario('trail-braking', 16);
  assert.equal(approach.steering, 0);
  assert.equal(approach.brake, 0);
  assert.ok(braking.brake > 80 && braking.speed < approach.speed);
  assert.ok(apex.steering > 30 && apex.brake === 0);
  assert.ok(exit.speed > apex.speed && exit.throttle === 100 && exit.steering === 0);
  const chicane = model.SCENARIOS.find((scenario) => scenario.id === 'daytona-chicane');
  assert.equal(chicane.source.kind, 'synthetic');
  assert.match(chicane.description, /not a recorded lap/i);
  assert.ok(chicane.samples.some((sample) => sample.steering < 0));
  assert.ok(chicane.samples.some((sample) => sample.steering > 0));
});

test('imported traces interpolate controls, preserve exact keyframes and stop at the final sample', () => {
  const source = scenarioFixture();
  const scenario = model.parseScenario(JSON.stringify(source));
  assert.deepEqual(scenario, source);
  assert.equal(model.scenarioDuration(scenario), 8);
  assert.deepEqual(model.sampleScenario(scenario, 1), { speed: 150, throttle: 15, brake: 35, steering: 2.5 });
  assert.deepEqual(model.sampleScenario(scenario, 4), { speed: 100, throttle: 0, brake: 10, steering: 25 });
  assert.deepEqual(model.sampleScenario(scenario, 8), { speed: 150, throttle: 85, brake: 0, steering: 2 });
  assert.deepEqual(model.sampleScenario(scenario, 800), model.sampleScenario(scenario, 8));
  assert.equal(model.scenarioPhase(scenario, 3), 'Braking');
  assert.equal(model.scenarioPhase(scenario, 8), 'Exit');
  assert.ok(Object.isFrozen(scenario) && Object.isFrozen(scenario.source) && Object.isFrozen(scenario.samples));
  assert.throws(() => { scenario.samples[0].speed = 0; });
  source.samples[0].speed = 0;
  assert.equal(scenario.samples[0].speed, 160);
});

test('recorded source metadata is preserved independently of synthetic built-in maneuvers', () => {
  const source = scenarioFixture();
  source.source = { kind: 'recorded', simulator: 'iRacing', car: 'Test car', track: 'Test layout', notes: 'Parser fixture values only.' };
  source.samples.forEach((sample) => { delete sample.phase; });
  const scenario = model.parseScenario(JSON.stringify(source));
  assert.deepEqual(scenario.source, source.source);
  assert.equal(model.scenarioPhase(scenario, 1), 'Recorded controls');
});

test('trace validation rejects malformed timing, unknown fields and out-of-range controls without clamping', () => {
  const bad = [null, [], {}, { ...scenarioFixture(), schemaVersion: 2 }, { ...scenarioFixture(), samples: [] }];
  const mutate = (change) => { const item = scenarioFixture(); change(item); bad.push(item); };
  mutate((item) => { item.samples = item.samples.slice(0, 1); });
  mutate((item) => { item.title = ''; });
  mutate((item) => { item.title = 'x'.repeat(121); });
  mutate((item) => { item.source.kind = 'unknown'; });
  mutate((item) => { item.source.extra = 'unknown'; });
  mutate((item) => { item.source.notes = false; });
  mutate((item) => { item.samples[0].time = 0.1; });
  mutate((item) => { item.samples[1].time = 0; });
  mutate((item) => { item.samples[2].time = 1; });
  mutate((item) => { item.samples.at(-1).time = 1800.1; });
  mutate((item) => { item.samples[1].time = null; });
  mutate((item) => { item.samples[1].speed = 301; });
  mutate((item) => { item.samples[1].speed = '140'; });
  mutate((item) => { item.samples[1].brake = -1; });
  mutate((item) => { item.samples[1].throttle = 101; });
  mutate((item) => { item.samples[1].steering = -121; });
  mutate((item) => { item.samples[1].phase = ''; });
  mutate((item) => { item.samples[1].extra = 1; });
  for (const item of bad) assert.throws(() => model.parseScenario(JSON.stringify(item)));
  assert.throws(() => model.parseScenario('{invalid'));
  assert.throws(() => model.parseScenario(JSON.stringify(scenarioFixture()).replace('"speed":160', '"speed":1e400')));
  assert.throws(() => model.parseScenario(JSON.stringify(scenarioFixture()).replace('"speed":160', '"__proto__":{},"speed":160')));
  assert.throws(() => model.parseScenario(' '.repeat(model.SCENARIO_MAX_BYTES + 1)), /smaller than 8 MiB/);
  const maximumDuration = scenarioFixture(); maximumDuration.samples.at(-1).time = 1800;
  assert.equal(model.scenarioDuration(model.parseScenario(JSON.stringify(maximumDuration))), 1800);
});

test('trace sample count accepts the declared maximum and rejects a larger trace', () => {
  const item = scenarioFixture();
  item.samples = Array.from({ length: 50000 }, (_, index) => ({ time: index / 100, speed: 100, throttle: 0, brake: 0, steering: 0 }));
  assert.equal(model.parseScenario(JSON.stringify(item)).samples.length, 50000);
  item.samples.push({ time: 500, speed: 100, throttle: 0, brake: 0, steering: 0 });
  assert.throws(() => model.parseScenario(JSON.stringify(item)), /50000 samples/);
});

test('version-3 sessions retain imported traces and phase even while manual controls are selected', () => {
  const scenario = model.parseScenario(JSON.stringify(scenarioFixture()));
  const inputs = model.sampleScenario(scenario, 3);
  const session = model.createSession(model.DEFAULT_SETUP, inputs, 'imported', null, 3, scenario);
  const restored = model.parseSession(JSON.stringify(session));
  assert.equal(restored.schemaVersion, 3);
  assert.equal(restored.scenarioId, 'imported');
  assert.equal(restored.scenarioTime, 3);
  assert.deepEqual(restored.customScenario, scenario);
  assert.deepEqual(model.sampleScenario(restored.customScenario, restored.scenarioTime), inputs);
  const manual = model.parseSession(JSON.stringify(model.createSession(model.DEFAULT_SETUP, inputs, 'manual', null, 3, scenario)));
  assert.deepEqual(manual.customScenario, scenario);
  assert.equal(manual.scenarioTime, 0);
  assert.equal(model.createSession(model.DEFAULT_SETUP, inputs, 'imported', null, 100, scenario).scenarioTime, 8);
  assert.throws(() => model.createSession(model.DEFAULT_SETUP, inputs, 'imported'));
});

test('version-2 sessions preserve setup, baseline and phase while adopting canonical finite-clip controls', () => {
  const current = model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'power-exit', model.DEFAULT_SETUP, 4);
  const legacy = { ...current, schemaVersion: 2 }; delete legacy.customScenario;
  legacy.inputs = { speed: 160, throttle: 95, brake: 0, steering: 10 }; // Old periodic preset at t=4.
  const migrated = model.parseSession(JSON.stringify(legacy));
  assert.deepEqual(migrated, { ...current, inputs: model.sampleScenario('power-exit', 4) });
  legacy.scenarioTime = 900;
  const finished = model.parseSession(JSON.stringify(legacy));
  assert.equal(finished.scenarioTime, model.scenarioDuration('power-exit'));
  assert.deepEqual(finished.inputs, model.sampleScenario('power-exit', finished.scenarioTime));
});

test('nonmanual sessions canonicalize controls at their clamped phase while still validating supplied controls', () => {
  const finished = model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'power-exit', null, 900);
  assert.equal(finished.scenarioTime, 8);
  assert.deepEqual(finished.inputs, model.sampleScenario('power-exit', 8));
  const middle = model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'trail-braking', null, 5.25);
  assert.deepEqual(middle.inputs, model.sampleScenario('trail-braking', 5.25));
  const scenario = model.parseScenario(JSON.stringify(scenarioFixture()));
  const imported = model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'imported', null, 1, scenario);
  assert.deepEqual(imported.inputs, model.sampleScenario(scenario, 1));
  const manual = model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'manual', null, 900);
  assert.deepEqual(manual.inputs, model.DEFAULT_INPUTS);
  assert.throws(() => model.createSession(model.DEFAULT_SETUP, { ...model.DEFAULT_INPUTS, speed: NaN }, 'power-exit', null, 4));
  assert.throws(() => model.createSession(model.DEFAULT_SETUP, { ...model.DEFAULT_INPUTS, extra: 0 }, 'power-exit', null, 4));
});

// Catches lossy session copies and baselines inadvertently including driver inputs.
test('sessions round-trip every numeric field precisely and copy their setup-only baseline', () => {
  assert.equal(typeof model.createSession, 'function', 'Session creation must be exported');
  const setup = { ...model.DEFAULT_SETUP, brakeBias: 57.125, frontRideHeight: 56.625 };
  const inputs = { ...model.DEFAULT_INPUTS, steering: -21.25 };
  const baseline = { ...model.DEFAULT_SETUP, wing: 9 };
  const session = model.createSession(setup, inputs, 'manual', baseline);
  assert.deepEqual(model.parseSession(JSON.stringify(session)), {
    kind: 'setup-lab-session', schemaVersion: 3, model: 'generic-gt-v1', setup, inputs, scenarioId: 'manual', baseline, scenarioTime: 0, customScenario: null,
  });
  setup.wing = 1;
  baseline.wing = 1;
  assert.equal(session.setup.wing, 6);
  assert.equal(session.baseline.wing, 9);
  assert.equal(model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'manual').baseline, null);
});

// Catches imported animation resuming at a different maneuver phase from its saved controls.
test('scenario phase and sampled controls round-trip together for resumed playback', () => {
  const inputs = model.sampleScenario('power-exit', 4);
  const session = model.createSession(model.DEFAULT_SETUP, inputs, 'power-exit', null, 4);
  assert.equal(session.schemaVersion, 3);
  assert.equal(session.scenarioTime, 4);
  const restored = model.parseSession(JSON.stringify(session));
  assert.equal(restored.scenarioTime, 4);
  assert.deepEqual(restored.inputs, inputs);
  assert.deepEqual(model.sampleScenario(restored.scenarioId, restored.scenarioTime), restored.inputs);
});

// Catches coercion or an unbounded/invalid animation clock poisoning future playback.
test('session creation and parsing reject invalid scenario phases', () => {
  const valid = model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'manual');
  for (const phase of [-1, NaN, Infinity, null, '4', 1e9 + 1]) {
    assert.throws(() => model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'manual', null, phase));
    assert.throws(() => model.parseSession(JSON.stringify({ ...valid, scenarioTime: phase })));
  }
  assert.equal(model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'manual').scenarioTime, 0);
  assert.equal(model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'manual', null, 1e9).scenarioTime, 0);
  assert.equal(model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'power-exit', null, 1e9).scenarioTime, model.scenarioDuration('power-exit'));
});

// Catches importing incompatible contracts, missing values, poisoned keys or numeric coercion.
test('session parsing rejects invalid, incompatible and malicious objects', () => {
  assert.equal(typeof model.createSession, 'function', 'Session validation must be exported');
  const valid = model.createSession(model.DEFAULT_SETUP, model.DEFAULT_INPUTS, 'manual');
  const bad = [
    null, [], {}, { ...valid, kind: 'other' }, { ...valid, schemaVersion: 1 }, { ...valid, schemaVersion: 999 },
    { ...valid, model: 'iracing' }, { ...valid, scenarioId: 'unknown' },
    { ...valid, setup: null }, { ...valid, setup: [] }, { ...valid, setup: { ...valid.setup, wing: 13 } },
    { ...valid, setup: { ...valid.setup, wing: '6' } }, { ...valid, setup: { ...valid.setup, wing: null } },
    { ...valid, inputs: { ...valid.inputs, speed: -1 } }, { ...valid, inputs: { ...valid.inputs, steering: 121 } },
    { ...valid, inputs: { ...valid.inputs, extra: 0 } }, { ...valid, baseline: { ...valid.setup, inputs: valid.inputs } },
    { ...valid, baseline: false }, { ...valid, unexpected: 'value' },
  ];
  const missing = structuredClone(valid);
  delete missing.setup.frontSpring;
  bad.push(missing);
  const missingPhase = structuredClone(valid);
  delete missingPhase.scenarioTime;
  bad.push(missingPhase);
  for (const item of bad) assert.throws(() => model.parseSession(JSON.stringify(item)));
  const legacy = { ...valid, schemaVersion: 1 };
  delete legacy.scenarioTime;
  assert.throws(() => model.parseSession(JSON.stringify(legacy)), /version 1.*scenario phase/i);
  assert.throws(() => model.parseSession('{broken'));
  assert.throws(() => model.parseSession(JSON.stringify(valid).replace('"wing":6', '"wing":1e400')));
  assert.throws(() => model.parseSession(JSON.stringify(valid).replace('"wing":6', '"__proto__":{"polluted":true},"wing":6')));
  assert.throws(() => model.parseSession(JSON.stringify(valid).replace('"wing":6', '"constructor":{},"wing":6')));
  assert.equal({}.polluted, undefined);
});
