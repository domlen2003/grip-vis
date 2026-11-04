
/**
 * A deliberately small, fictional GT-car illustration. These coefficients are
 * assumptions, not measured tyre forces, setup legality or a vehicle predictor.
 * Coordinates: +x forward, +y to the driver's right; positive steer turns right.
 */
/** @typedef {{frontRideHeight:number,rearRideHeight:number,frontSpring:number,rearSpring:number,frontArb:number,rearArb:number,wing:number,brakeBias:number,damping:number,frontTravel:number,rearTravel:number}} Setup */
/** @typedef {{speed:number,throttle:number,brake:number,steering:number}} Inputs */
/** @typedef {{key:string,label:string,min:number,max:number,step:number,unit:string,group:string}} ControlField */
/** @typedef {Inputs & {time:number,phase?:string}} ScenarioSample */
/** @typedef {{kind:'recorded'|'synthetic',simulator?:string,car?:string,track?:string,notes?:string}} ScenarioSource */
/** @typedef {{kind:'setup-lab-scenario',schemaVersion:1,title:string,source:ScenarioSource,samples:ReadonlyArray<ScenarioSample>}} ControlScenario */
/** @typedef {{id:string,label:string,description:string,duration:number,inputs:Readonly<Inputs>,source:ScenarioSource,samples:ReadonlyArray<ScenarioSample>}} BuiltinScenario */

export const SCENARIO_MAX_BYTES = 8 * 1024 * 1024;
// Allow the scenario payload plus pretty-printed session/export whitespace.
export const SESSION_MAX_BYTES = 16 * 1024 * 1024;

/** @type {Readonly<Setup>} */
export const DEFAULT_SETUP = Object.freeze({
  frontRideHeight: 55, rearRideHeight: 75,
  frontSpring: 120, rearSpring: 135,
  frontArb: 55, rearArb: 45,
  wing: 6, brakeBias: 55, damping: 55,
  frontTravel: 30, rearTravel: 35,
});

/** @type {Readonly<Inputs>} */
export const DEFAULT_INPUTS = Object.freeze({ speed: 140, throttle: 15, brake: 35, steering: 20 });

/** @param {ControlField[]} items */
const fields = (items) => Object.freeze(items.map((item) => Object.freeze(item)));
export const SETUP_FIELDS = fields([
  { key: 'frontRideHeight', label: 'Front ride height', min: 35, max: 90, step: 1, unit: 'mm', group: 'Platform' },
  { key: 'rearRideHeight', label: 'Rear ride height', min: 40, max: 110, step: 1, unit: 'mm', group: 'Platform' },
  { key: 'frontSpring', label: 'Front spring', min: 60, max: 240, step: 5, unit: 'N/mm', group: 'Stiffness' },
  { key: 'rearSpring', label: 'Rear spring', min: 60, max: 240, step: 5, unit: 'N/mm', group: 'Stiffness' },
  { key: 'frontArb', label: 'Front anti-roll bar', min: 0, max: 100, step: 1, unit: 'index', group: 'Stiffness' },
  { key: 'rearArb', label: 'Rear anti-roll bar', min: 0, max: 100, step: 1, unit: 'index', group: 'Stiffness' },
  { key: 'wing', label: 'Rear wing', min: 0, max: 12, step: 1, unit: 'index', group: 'Aero & balance' },
  { key: 'brakeBias', label: 'Brake bias', min: 45, max: 70, step: 0.5, unit: '% front', group: 'Aero & balance' },
  { key: 'damping', label: 'Bump damping', min: 0, max: 100, step: 1, unit: 'index', group: 'Travel & recovery' },
  { key: 'frontTravel', label: 'Front compression travel', min: 10, max: 70, step: 1, unit: 'mm', group: 'Travel & recovery' },
  { key: 'rearTravel', label: 'Rear compression travel', min: 10, max: 70, step: 1, unit: 'mm', group: 'Travel & recovery' },
]);

export const INPUT_FIELDS = fields([
  { key: 'speed', label: 'Speed', min: 0, max: 300, step: 1, unit: 'km/h', group: 'Driver inputs' },
  { key: 'throttle', label: 'Throttle', min: 0, max: 100, step: 1, unit: '%', group: 'Driver inputs' },
  { key: 'brake', label: 'Brake', min: 0, max: 100, step: 1, unit: '%', group: 'Driver inputs' },
  { key: 'steering', label: 'Steering wheel', min: -120, max: 120, step: 1, unit: '°', group: 'Driver inputs' },
]);

/** @param {string} id @param {string} label @param {string} description @param {ScenarioSample[]} samples */
function preset(id, label, description, samples) {
  /** @type {ScenarioSource} */
  const source = { kind: 'synthetic', notes: description };
  return Object.freeze({ id, label, description, duration: samples.at(-1)?.time ?? 0,
    inputs: Object.freeze(samples.length ? inputsFromSample(samples[0]) : { ...DEFAULT_INPUTS }),
    source: Object.freeze(source), samples: Object.freeze(samples.map((sample) => Object.freeze(sample))),
  });
}

/** Finite illustrative maneuvers, not recorded driving or solved trajectories. @type {ReadonlyArray<BuiltinScenario>} */
export const SCENARIOS = Object.freeze([
  preset('manual', 'Manual', 'Hold your own speed and driver inputs.', []),
  preset('trail-braking', 'Trail braking', 'Synthetic full corner: approach, braking, trail release, apex and acceleration.', [
    { time: 0, speed: 190, throttle: 60, brake: 0, steering: 0, phase: 'Approach' },
    { time: 1.5, speed: 195, throttle: 0, brake: 5, steering: 0, phase: 'Brake application' },
    { time: 2.5, speed: 180, throttle: 0, brake: 85, steering: 0, phase: 'Straight braking' },
    { time: 4.5, speed: 130, throttle: 0, brake: 40, steering: 12, phase: 'Trail braking' },
    { time: 6.5, speed: 100, throttle: 0, brake: 8, steering: 34, phase: 'Brake release' },
    { time: 8, speed: 95, throttle: 12, brake: 0, steering: 38, phase: 'Apex' },
    { time: 11, speed: 130, throttle: 70, brake: 0, steering: 18, phase: 'Exit acceleration' },
    { time: 16, speed: 190, throttle: 100, brake: 0, steering: 0, phase: 'Exit complete' },
  ]),
  preset('power-exit', 'Power exit', 'Synthetic corner exit: feed in rear-wheel power while unwinding steering.', [
    { time: 0, speed: 95, throttle: 25, brake: 0, steering: 42, phase: 'Apex' },
    { time: 1, speed: 100, throttle: 45, brake: 0, steering: 38, phase: 'Power application' },
    { time: 3, speed: 120, throttle: 70, brake: 0, steering: 25, phase: 'Unwind steering' },
    { time: 5, speed: 145, throttle: 95, brake: 0, steering: 8, phase: 'Exit acceleration' },
    { time: 8, speed: 180, throttle: 100, brake: 0, steering: 0, phase: 'Exit complete' },
  ]),
  preset('fast-sweeper', 'Fast sweeper', 'Synthetic high-speed corner: turn in, hold a loaded arc, then unwind and accelerate.', [
    { time: 0, speed: 210, throttle: 65, brake: 0, steering: 0, phase: 'Approach' },
    { time: 2, speed: 210, throttle: 40, brake: 0, steering: 8, phase: 'Turn-in' },
    { time: 4, speed: 208, throttle: 45, brake: 0, steering: 14, phase: 'Loaded arc' },
    { time: 8, speed: 215, throttle: 65, brake: 0, steering: 12, phase: 'Power and unwind' },
    { time: 10, speed: 225, throttle: 85, brake: 0, steering: 4, phase: 'Exit acceleration' },
    { time: 12, speed: 240, throttle: 100, brake: 0, steering: 0, phase: 'Exit complete' },
  ]),
  preset('daytona-chicane', 'Daytona-style chicane', 'Synthetic Daytona-style chicane sequence; not a recorded lap or a track calibration.', [
    { time: 0, speed: 280, throttle: 100, brake: 0, steering: 0, phase: 'Approach' },
    { time: 2, speed: 280, throttle: 0, brake: 10, steering: 0, phase: 'Brake application' },
    { time: 4, speed: 185, throttle: 0, brake: 90, steering: 0, phase: 'Straight braking' },
    { time: 6, speed: 135, throttle: 0, brake: 30, steering: -25, phase: 'Left entry / trail release' },
    { time: 8, speed: 120, throttle: 20, brake: 0, steering: -38, phase: 'Left apex' },
    { time: 10, speed: 125, throttle: 35, brake: 0, steering: 30, phase: 'Right transition' },
    { time: 12, speed: 130, throttle: 25, brake: 5, steering: 36, phase: 'Right apex' },
    { time: 14, speed: 125, throttle: 25, brake: 0, steering: -30, phase: 'Left transition' },
    { time: 16, speed: 135, throttle: 45, brake: 0, steering: 25, phase: 'Final right' },
    { time: 19, speed: 175, throttle: 85, brake: 0, steering: 8, phase: 'Exit acceleration' },
    { time: 24, speed: 245, throttle: 100, brake: 0, steering: 0, phase: 'Exit complete' },
  ]),
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const radians = (degrees) => degrees * Math.PI / 180;
const degrees = (radiansValue) => radiansValue * 180 / Math.PI;
const MASS_KG = 1250;
const G = 9.81;
const WHEELBASE_M = 2.8;
const TRACK_M = 1.64;
const CG_HEIGHT_M = 0.35;
const STATIC_FRONT = 0.48;

function boundedValues(value, metadata, defaults) {
  return Object.fromEntries(metadata.map((field) => {
    const candidate = value?.[field.key];
    return [field.key, clamp(Number.isFinite(candidate) ? candidate : defaults[field.key], field.min, field.max)];
  }));
}

/** @param {ScenarioSample} sample @returns {Inputs} */
function inputsFromSample(sample) {
  return { speed: sample.speed, throttle: sample.throttle, brake: sample.brake, steering: sample.steering };
}

/** @param {string|ControlScenario|BuiltinScenario} idOrScenario */
function resolveScenario(idOrScenario) {
  const scenario = typeof idOrScenario === 'string' ? SCENARIOS.find((item) => item.id === idOrScenario) : idOrScenario;
  if (!scenario || !Array.isArray(scenario.samples)) throw new Error('Unknown scenario.');
  return scenario;
}

/** @param {string|ControlScenario|BuiltinScenario} idOrScenario */
export function scenarioDuration(idOrScenario) {
  return resolveScenario(idOrScenario).samples.at(-1)?.time ?? 0;
}

/** Binary-search finite sample intervals; beyond the end means the exact final frame. */
function scenarioInterval(scenario, seconds) {
  const samples = scenario.samples;
  const time = clamp(Number.isFinite(seconds) ? seconds : 0, 0, samples.at(-1)?.time ?? 0);
  let low = 0;
  let high = samples.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (samples[middle].time <= time) low = middle;
    else high = middle;
  }
  if (time >= samples[high].time) low = high;
  return { left: samples[low], right: samples[high], time };
}

/** Linear control interpolation, not a solved trajectory; time never wraps or loops. @param {string|ControlScenario|BuiltinScenario} idOrScenario @returns {Inputs} */
export function sampleScenario(idOrScenario, seconds) {
  const scenario = resolveScenario(idOrScenario);
  if (!scenario.samples.length) return { ...DEFAULT_INPUTS };
  const { left, right, time } = scenarioInterval(scenario, seconds);
  if (left === right || time === left.time) return inputsFromSample(left);
  const progress = (time - left.time) / (right.time - left.time);
  return /** @type {Inputs} */ (Object.fromEntries(INPUT_FIELDS.map(({ key }) => [key, left[key] + (right[key] - left[key]) * progress])));
}

/** @param {string|ControlScenario|BuiltinScenario} idOrScenario */
export function scenarioPhase(idOrScenario, seconds) {
  const scenario = resolveScenario(idOrScenario);
  if (!scenario.samples.length) return 'Manual inputs';
  return scenarioInterval(scenario, seconds).left.phase ?? (scenario.source.kind === 'recorded' ? 'Recorded controls' : 'Synthetic controls');
}

/**
 * A damped, front-left heuristic pulse lasting three seconds. This conserves
 * total vertical load while illustrating a local disturbance. It does not solve
 * wheel contact, damper piston velocity, road input or suspension dynamics.
 */
function applyBump(loads, setup, transient) {
  const elapsed = transient?.elapsed;
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= 3) return false;
  const height = Number.isFinite(transient?.height) ? clamp(transient.height, 0, 70) : 18;
  if (height === 0) return false;
  const pulseMm = height * Math.exp(-(1.6 + setup.damping * 0.034) * elapsed) * Math.cos(17 * elapsed);
  const disturbanceN = pulseMm * setup.frontSpring * 0.65;
  const changes = [disturbanceN, -0.45 * disturbanceN, -0.35 * disturbanceN, -0.2 * disturbanceN];
  // Limit the whole redistribution together so no donor tyre acquires negative load.
  let scale = 1;
  changes.forEach((change, index) => {
    if (change < 0) scale = Math.min(scale, loads[index] / -change);
  });
  changes.forEach((change, index) => { loads[index] = Math.max(0, loads[index] + change * scale); });
  return true;
}

/** Same maneuver with an optional vertical-aero load; drag is unchanged in both cases. */
function evaluateState(setup, inputs, transient, includeDownforce) {
  const s = boundedValues(setup, SETUP_FIELDS, DEFAULT_SETUP);
  const i = boundedValues(inputs, INPUT_FIELDS, DEFAULT_INPUTS);
  const speedMps = i.speed / 3.6;
  const weightN = MASS_KG * G;
  const staticRakeMm = s.rearRideHeight - s.frontRideHeight;
  const rakeFactor = clamp(1 + (staticRakeMm - 20) * 0.002, 0.75, 1.16);
  const downforceN = includeDownforce ? speedMps ** 2 * (0.9 + s.wing * 0.14) * rakeFactor : 0;
  const dragN = speedMps ** 2 * (0.29 + s.wing * 0.025);
  const frontAero = clamp(0.43 + (staticRakeMm - 20) * 0.0013 - (s.wing - 6) * 0.004, 0.32, 0.55);

  const driveN = i.throttle / 100 * weightN * 0.62 / (1 + speedMps / 85);
  const brakeN = i.brake / 100 * weightN * 1.5 * Math.min(1, speedMps / 2);
  const ax = (driveN - brakeN - dragN) / MASS_KG;
  // A simple bicycle demand with a fixed fictional 14:1 steering ratio.
  const ayG = clamp(speedMps ** 2 * Math.tan(radians(i.steering / 14)) / WHEELBASE_M / G, -2.4, 2.4);
  const lateralN = MASS_KG * G * ayG;
  const totalLoadN = weightN + downforceN;
  const longitudinalTransferN = MASS_KG * ax * CG_HEIGHT_M / WHEELBASE_M;
  const frontNormalN = clamp(weightN * STATIC_FRONT + downforceN * frontAero - longitudinalTransferN, totalLoadN * 0.05, totalLoadN * 0.95);
  const rearNormalN = totalLoadN - frontNormalN;
  const frontRollStiffness = s.frontSpring * 2 + s.frontArb * 3.2;
  const rearRollStiffness = s.rearSpring * 2 + s.rearArb * 3.2;
  const frontRollShare = frontRollStiffness / (frontRollStiffness + rearRollStiffness);
  const rollTransferN = lateralN * CG_HEIGHT_M / TRACK_M;
  const frontTransferN = clamp(rollTransferN * frontRollShare, -frontNormalN / 2, frontNormalN / 2);
  const rearTransferN = clamp(rollTransferN * (1 - frontRollShare), -rearNormalN / 2, rearNormalN / 2);
  const loads = [
    frontNormalN / 2 + frontTransferN, frontNormalN / 2 - frontTransferN,
    rearNormalN / 2 + rearTransferN, rearNormalN / 2 - rearTransferN,
  ];
  const bumpActive = applyBump(loads, s, transient);

  const wheels = ['FL', 'FR', 'RL', 'RR'].map((id, index) => {
    const front = index < 2;
    const axle = front ? 'front' : 'rear';
    const staticLoadN = weightN * (front ? STATIC_FRONT : 1 - STATIC_FRONT) / 2;
    const requestedCompressionMm = (loads[index] - staticLoadN) / s[`${axle}Spring`];
    const travelMm = s[`${axle}Travel`];
    const displacementMm = clamp(requestedCompressionMm, -travelMm * 0.45, travelMm);
    const rideHeightMm = Math.max(6, s[`${axle}RideHeight`] - displacementMm);
    const fxN = front ? -brakeN * s.brakeBias / 100 / 2 : (driveN - brakeN * (1 - s.brakeBias / 100)) / 2;
    const axleNormalN = front ? loads[0] + loads[1] : loads[2] + loads[3];
    const fyN = lateralN * (front ? STATIC_FRONT : 1 - STATIC_FRONT) * loads[index] / Math.max(1, axleNormalN);
    // Assumed load sensitivity: doubling normal load gives less than double capacity.
    // Downforce is included once, in loads[index]; there is no additional aero grip multiplier.
    const capacityN = 1.45 * 3000 * (loads[index] / 3000) ** 0.88;
    return {
      id, loadN: loads[index], fxN, fyN, capacityN,
      utilization: Math.hypot(fxN, fyN) / Math.max(1, capacityN),
      rideHeightMm, compressionMm: clamp(requestedCompressionMm, 0, travelMm),
      stopEngaged: requestedCompressionMm >= travelMm || rideHeightMm <= 6,
    };
  });
  const usage = (pair) => pair.reduce((total, wheel) => total + Math.hypot(wheel.fxN, wheel.fyN), 0)
    / Math.max(1, pair.reduce((total, wheel) => total + wheel.capacityN, 0));
  const frontUsage = usage(wheels.slice(0, 2));
  const rearUsage = usage(wheels.slice(2));
  const frontRideHeightMm = (wheels[0].rideHeightMm + wheels[1].rideHeightMm) / 2;
  const rearRideHeightMm = (wheels[2].rideHeightMm + wheels[3].rideHeightMm) / 2;
  const rakeMm = rearRideHeightMm - frontRideHeightMm;
  const pitchDeg = degrees(Math.atan((rakeMm - staticRakeMm) / (WHEELBASE_M * 1000)));
  const rollDeg = degrees(Math.atan(((wheels[1].rideHeightMm + wheels[3].rideHeightMm)
    - (wheels[0].rideHeightMm + wheels[2].rideHeightMm)) / (2 * TRACK_M * 1000)));
  const platformLimited = wheels.some((wheel) => wheel.stopEngaged);
  const metrics = {
    speedKmh: i.speed, axG: ax / G, ayG, downforceN, dragN, frontAeroPct: frontAero * 100,
    frontUsage, rearUsage, frontRideHeightMm, rearRideHeightMm, rakeMm, pitchDeg, rollDeg, platformLimited,
  };
  return { wheels, metrics, bumpActive };
}

/**
 * Requested forces may exceed the assumed envelope; never report them as realized grip.
 * Mechanical capacity is a counterfactual at the same speed, inputs, setup and bump,
 * with vertical downforce removed but aero drag retained. Aero capacity is the signed
 * nonlinear difference, not an additional friction multiplier. Donor-limited bump
 * redistribution can make this difference negative at one wheel; keep that sign.
 */
export function evaluate(setup = DEFAULT_SETUP, inputs = DEFAULT_INPUTS, transient = { elapsed: Infinity, height: 18 }) {
  const actual = evaluateState(setup, inputs, transient, true);
  const mechanical = evaluateState(setup, inputs, transient, false);
  const wheels = actual.wheels.map((wheel, index) => {
    const reference = mechanical.wheels[index];
    return { ...wheel,
      mechanicalCapacityN: reference.capacityN,
      aeroCapacityN: wheel.capacityN - reference.capacityN,
      mechanicalLoadN: reference.loadN,
      aeroLoadN: wheel.loadN - reference.loadN,
    };
  });
  const metrics = { ...actual.metrics,
    totalCapacityN: wheels.reduce((total, wheel) => total + wheel.capacityN, 0),
    totalMechanicalCapacityN: wheels.reduce((total, wheel) => total + wheel.mechanicalCapacityN, 0),
    totalAeroCapacityN: wheels.reduce((total, wheel) => total + wheel.aeroCapacityN, 0),
  };
  const { frontUsage, rearUsage, platformLimited } = metrics;
  const bumpActive = actual.bumpActive;
  const maxUsage = Math.max(frontUsage, rearUsage);
  const hints = [{
    tone: maxUsage > 1 ? 'warning' : 'neutral',
    title: maxUsage > 1 ? 'Demand exceeds assumed envelope' : 'Assumed force demand',
    detail: 'The circles compare requested combined force with a fictional load-sensitive capacity. They do not measure slip or available grip.',
  }];
  if (Math.abs(frontUsage - rearUsage) > 0.06) hints.push({
    tone: 'neutral', title: frontUsage > rearUsage ? 'Front axle works harder' : 'Rear axle works harder',
    detail: 'Compare brake allocation, rear-wheel power and roll-load distribution under this same maneuver. This is a demand balance, not a prediction of understeer or oversteer.',
  });
  if (platformLimited) hints.push({ tone: 'warning', title: 'Compression travel reached', detail: 'At least one assumed spring displacement reaches its travel limit. The illustration caps motion; it does not calculate bump-stop forces or aero stall.' });
  if (bumpActive) hints.push({ tone: 'neutral', title: 'Front-left heuristic pulse', detail: 'The local load pulse decays with the damping index and redistributes vertical load. It is not a prediction of wheel-contact dynamics.' });
  return { wheels, metrics, hints };
}

const SESSION_V2_KEYS = ['kind', 'schemaVersion', 'model', 'setup', 'inputs', 'scenarioId', 'baseline', 'scenarioTime'];
const SESSION_KEYS = [...SESSION_V2_KEYS, 'customScenario'];
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const validatedScenarios = new WeakSet();

function exactObject(value, keys, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${label} must be a plain object.`);
  const actualKeys = Reflect.ownKeys(value);
  if (actualKeys.length !== keys.length || actualKeys.some((key) => !keys.includes(key) || DANGEROUS_KEYS.has(key))) {
    throw new Error(`${label} must contain exactly the supported fields.`);
  }
}

function validatedValues(value, metadata, label) {
  exactObject(value, metadata.map((field) => field.key), label);
  return Object.fromEntries(metadata.map((field) => {
    const number = value[field.key];
    if (typeof number !== 'number' || !Number.isFinite(number) || number < field.min || number > field.max) {
      throw new Error(`${label}.${field.key} must be a finite number from ${field.min} to ${field.max}.`);
    }
    return [field.key, number];
  }));
}

function objectShape(value, required, optional, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a plain object.`);
  exactObject(value, [...required, ...optional.filter((key) => Object.hasOwn(value, key))], label);
}

function scenarioText(value, label, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${label} must be a nonempty string up to ${max} characters.`);
  }
  return value.trim();
}

function parseJson(text, maxBytes, label) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error(`${label} must be JSON smaller than ${maxBytes / 1024 / 1024} MiB.`);
  }
  return JSON.parse(text, (key, value) => {
    if (DANGEROUS_KEYS.has(key)) throw new Error('Unsafe JSON field.');
    return value;
  });
}

/** @returns {ControlScenario} */
function validateScenario(value) {
  if (validatedScenarios.has(value)) return value;
  exactObject(value, ['kind', 'schemaVersion', 'title', 'source', 'samples'], 'scenario');
  if (value.kind !== 'setup-lab-scenario' || value.schemaVersion !== 1) throw new Error('Unsupported scenario kind or schema version.');
  const title = scenarioText(value.title, 'scenario.title');
  objectShape(value.source, ['kind'], ['simulator', 'car', 'track', 'notes'], 'scenario.source');
  if (!['recorded', 'synthetic'].includes(value.source.kind)) throw new Error('scenario.source.kind must be recorded or synthetic.');
  /** @type {ScenarioSource} */
  const source = { kind: value.source.kind };
  for (const key of ['simulator', 'car', 'track', 'notes']) {
    if (Object.hasOwn(value.source, key)) source[key] = scenarioText(value.source[key], `scenario.source.${key}`, key === 'notes' ? 1000 : 120);
  }
  if (!Array.isArray(value.samples) || value.samples.length < 2 || value.samples.length > 50000) {
    throw new Error('A scenario requires between 2 and 50000 samples.');
  }
  let previousTime = -1;
  const samples = value.samples.map((sample, index) => {
    const label = `scenario.samples[${index}]`;
    objectShape(sample, ['time', 'speed', 'throttle', 'brake', 'steering'], ['phase'], label);
    if (typeof sample.time !== 'number' || !Number.isFinite(sample.time) || sample.time < 0 || sample.time > 1800
      || (index === 0 && sample.time !== 0) || sample.time <= previousTime) {
      throw new Error(`${label}.time must start at zero, increase strictly and stay within 1800 seconds.`);
    }
    previousTime = sample.time;
    for (const field of INPUT_FIELDS) {
      const number = sample[field.key];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < field.min || number > field.max) {
        throw new Error(`${label}.${field.key} must be a finite number from ${field.min} to ${field.max}; samples are not clamped.`);
      }
    }
    return Object.freeze({ time: sample.time, ...inputsFromSample(sample),
      ...(Object.hasOwn(sample, 'phase') ? { phase: scenarioText(sample.phase, `${label}.phase`, 80) } : {}),
    });
  });
  /** @type {ControlScenario} */
  const validated = Object.freeze({ kind: 'setup-lab-scenario', schemaVersion: 1, title,
    source: Object.freeze(source), samples: Object.freeze(samples),
  });
  if (new TextEncoder().encode(JSON.stringify(validated)).byteLength > SCENARIO_MAX_BYTES) {
    throw new Error('Scenario JSON must be smaller than 8 MiB.');
  }
  validatedScenarios.add(validated);
  return validated;
}

/** Import a timed control trace. Recorded source metadata is a declaration, not validation of vehicle physics. */
export function parseScenario(text) {
  return validateScenario(parseJson(text, SCENARIO_MAX_BYTES, 'Scenario'));
}

/**
 * Baselines store a setup only, and are evaluated under the current driver input.
 * @param {Setup} setup
 * @param {Inputs} inputs
 * @param {string} scenarioId
 * @param {Setup|null} [baseline]
 * @param {number} [scenarioTime]
 * @param {ControlScenario|null} [customScenario]
 */
export function createSession(setup, inputs, scenarioId, baseline = null, scenarioTime = 0, customScenario = null) {
  const custom = customScenario === null ? null : validateScenario(customScenario);
  if (scenarioId === 'imported' ? custom === null : !SCENARIOS.some((scenario) => scenario.id === scenarioId)) {
    throw new Error(scenarioId === 'imported' ? 'Imported playback requires a custom scenario.' : 'Unknown scenario.');
  }
  if (!Number.isFinite(scenarioTime) || scenarioTime < 0 || scenarioTime > 1e9) {
    throw new Error('Scenario time must be a finite number from 0 to 1000000000 seconds.');
  }
  const activeScenario = scenarioId === 'imported' ? custom : scenarioId;
  const duration = scenarioDuration(activeScenario);
  const time = Math.min(scenarioTime, duration);
  // Validate every supplied field even when the clip will replace the snapshot.
  const suppliedInputs = validatedValues(inputs, INPUT_FIELDS, 'inputs');
  return {
    kind: 'setup-lab-session', schemaVersion: 3, model: 'generic-gt-v1',
    setup: validatedValues(setup, SETUP_FIELDS, 'setup'),
    inputs: scenarioId === 'manual' ? suppliedInputs : sampleScenario(activeScenario, time), scenarioId,
    baseline: baseline === null ? null : validatedValues(baseline, SETUP_FIELDS, 'baseline'),
    scenarioTime: time, customScenario: custom,
  };
}

export function parseSession(jsonString) {
  const session = parseJson(jsonString, SESSION_MAX_BYTES, 'Session');
  if (session?.schemaVersion === 1) throw new Error('Session version 1 does not store scenario phase. Export a new version 3 session.');
  const legacy = session?.schemaVersion === 2;
  exactObject(session, legacy ? SESSION_V2_KEYS : SESSION_KEYS, 'session');
  if (session.kind !== 'setup-lab-session' || ![2, 3].includes(session.schemaVersion) || session.model !== 'generic-gt-v1') {
    throw new Error('Unsupported session kind, schema version or model.');
  }
  return createSession(session.setup, session.inputs, session.scenarioId, session.baseline, session.scenarioTime, legacy ? null : session.customScenario);
}
