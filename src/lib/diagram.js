
/**
 * Diagram coordinates express requested road → tyre forces in vehicle axes:
 * +Fx forward, +Fy right. The opposite force acts on the road, not on the car.
 * https://openstax.org/books/university-physics-volume-1/pages/5-5-newtons-third-law
 * SVG points down; the Three scene uses +X right, +Y up, and forward along -Z.
 */
export const CHASSIS = Object.freeze({
  left: 278, right: 402, top: 171, bottom: 472, centerX: 340, centerY: 321.5,
});

// Conservative inner bounds for the platform cue, clear of the GT body perimeter.
export const CAR_INNER_BOUNDS = Object.freeze({ left: 296, right: 384, top: 250, bottom: 392 });

export const WHEEL_POSITIONS = Object.freeze({
  FL: Object.freeze([150, 170]), FR: Object.freeze([530, 170]),
  RL: Object.freeze([150, 440]), RR: Object.freeze([530, 440]),
});

export const SPRING_ANCHORS = Object.freeze({
  FL: Object.freeze([278, 235.1]), FR: Object.freeze([402, 235.1]),
  RL: Object.freeze([278, 408.7]), RR: Object.freeze([402, 408.7]),
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const observerSign = (observer) => observer === 'tyre-on-road' ? -1 : 1;

function roundedPolygonPath(points, radius = 4) {
  const sections = points.map((corner, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const inset = (point) => {
      const distance = Math.hypot(point[0] - corner[0], point[1] - corner[1]);
      const fraction = Math.min(0.2, radius / Math.max(1, distance));
      return [corner[0] + (point[0] - corner[0]) * fraction, corner[1] + (point[1] - corner[1]) * fraction];
    };
    return { corner, incoming: inset(previous), outgoing: inset(next) };
  });
  const point = (values) => values.map((value) => value.toFixed(2)).join(',');
  return `M${point(sections[0].incoming)} ${sections.map(({ corner, incoming, outgoing }, index) =>
    `${index ? `L${point(incoming)} ` : ''}Q${point(corner)} ${point(outgoing)}`).join(' ')} Z`;
}

/**
 * Qualitative platform cue only: not a measured centre of pressure or car pose.
 * Perspective makes amplified pitch/roll visible from above without yawing the car.
 */
export function aeroBox(metrics = {}) {
  const width = 56;
  const height = 80;
  const dynamicPitch = finite(metrics?.pitchDeg);
  // Total rake carries ride-height setup changes; pitchDeg alone is only motion from that setup.
  // Partial teaching states can still supply pitch without a complete evaluated rake metric.
  const rakeOffset = Number.isFinite(metrics?.rakeMm)
    ? metrics.rakeMm - 20 : dynamicPitch * Math.PI / 180 * 2800;
  const pitchAngle = 24 * Math.tanh(rakeOffset / 28);
  const rollAngle = 24 * Math.tanh(finite(metrics?.rollDeg) / 1.1);
  const pitch = pitchAngle * Math.PI / 180;
  const roll = rollAngle * Math.PI / 180;
  const localCorners = [[-width / 2, -height / 2], [width / 2, -height / 2],
    [width / 2, height / 2], [-width / 2, height / 2]].map(([x, y]) => {
    // Positive model pitch lowers the nose (-y); positive roll lowers the left (-x).
    const pitchedY = y * Math.cos(pitch);
    const pitchedZ = y * Math.sin(pitch);
    const rotatedX = x * Math.cos(roll) - pitchedZ * Math.sin(roll);
    const rotatedZ = x * Math.sin(roll) + pitchedZ * Math.cos(roll);
    const perspective = 150 / (150 - rotatedZ);
    return [rotatedX * perspective, pitchedY * perspective];
  });
  const xs = localCorners.map(([x]) => x);
  const ys = localCorners.map(([, y]) => y);
  // Keep the assumed balance response visible across setup ranges instead of hard-clipping early.
  // frontAeroPct includes the generic map's static-rake and wing effects, even at zero speed.
  const dx = -9 * Math.tanh(finite(metrics?.rollDeg) / 1.2);
  const dy = 22 * Math.tanh((43 - finite(metrics?.frontAeroPct, 43)) / 12 - dynamicPitch * 2);
  const cx = clamp(CHASSIS.centerX + dx,
    CAR_INNER_BOUNDS.left + Math.max(width / 2, -Math.min(...xs)),
    CAR_INNER_BOUNDS.right - Math.max(width / 2, Math.max(...xs)));
  const cy = clamp(CHASSIS.centerY + dy,
    CAR_INNER_BOUNDS.top + Math.max(height / 2, -Math.min(...ys)),
    CAR_INNER_BOUNDS.bottom - Math.max(height / 2, Math.max(...ys)));
  const corners = localCorners.map(([x, y]) => [cx + x, cy + y]);
  return { x: cx - width / 2, y: cy - height / 2, width, height, cx, cy,
    dx: cx - CHASSIS.centerX, dy: cy - CHASSIS.centerY,
    pitchAngle, rollAngle, corners, path: roundedPolygonPath(corners), pivot: { x: cx, y: cy } };
}

export function envelopeRadius(capacityN) {
  // A shared, fixed area scale: no individual-wheel ceiling or automatic zoom.
  return 50 * Math.sqrt(Math.max(0, finite(capacityN)) / 4350);
}

/** Preserve demand magnitude separately when its drawing exceeds the available area. */
export function plotForce(wheel, radius, observer = 'road-on-tyre') {
  const capacity = Math.max(1, finite(wheel?.capacityN));
  const drawRadius = Math.max(0, finite(radius));
  const scale = drawRadius / capacity;
  const sign = observerSign(observer);
  const rawX = finite(wheel?.fyN) * scale * sign;
  const rawY = -finite(wheel?.fxN) * scale * sign;
  const distance = Math.hypot(rawX, rawY);
  // Keep over-capacity demand outside even when the uncapped ring grows past 92.
  const maxDrawDistance = Math.max(92, drawRadius + 12);
  const clipped = distance > maxDrawDistance;
  const clipScale = clipped ? maxDrawDistance / distance : 1;
  return { x: rawX * clipScale, y: rawY * clipScale, clipped, rawX, rawY };
}

/** These forces already use vehicle axes; do not rotate them with front-wheel steer. */
export function forceToWorld(fx, fy, observer = 'road-on-tyre') {
  const sign = observerSign(observer);
  return { x: finite(fy) * sign, y: 0, z: -finite(fx) * sign };
}

export function frontWheelAngle(steeringWheelDegrees) {
  return clamp(finite(steeringWheelDegrees), -120, 120) / 14;
}

export function frontWheelRotationY(steeringWheelDegrees) {
  return -frontWheelAngle(steeringWheelDegrees) * Math.PI / 180;
}

/** Visual emphasis only; the evaluator and physical road-wheel readout keep the 14:1 ratio. */
export function visualWheelAngle(steeringWheelDegrees) {
  const input = clamp(finite(steeringWheelDegrees), -120, 120);
  return 40 * Math.tanh(input / 40) / Math.tanh(3);
}

export function visualWheelRotationY(steeringWheelDegrees) {
  return -visualWheelAngle(steeringWheelDegrees) * Math.PI / 180;
}

/** Compression changes coil width while both attachments stay fixed on their bodies. */
export function springPath(start, end, compression) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return `M${start[0]},${start[1]} L${end[0]},${end[1]}`;
  const nx = -dy / distance;
  const ny = dx / distance;
  const width = 4 + clamp(finite(compression), 0, 30) / 18;
  const points = [start];
  for (let index = 0; index <= 12; index += 1) {
    const progress = 0.14 + index / 12 * 0.72;
    const side = index % 2 ? width : -width;
    points.push([start[0] + dx * progress + nx * side, start[1] + dy * progress + ny * side]);
  }
  points.push(end);
  return `M${points.map((point) => point.map((value) => value.toFixed(1)).join(',')).join(' L')}`;
}
