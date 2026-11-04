import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { visualWheelRotationY } from './diagram.js';

export type ExplainerTopic = 'grip' | 'aero' | 'suspension';
export type DriverInputs = { speed: number; throttle: number; brake: number; steering: number };
export type ExplainerMetrics = Record<string, number | boolean>;
export type ForceObserver = 'both' | 'tyre' | 'road';

export interface ExplainerState {
  topic: ExplainerTopic;
  inputs: DriverInputs;
  fx: number;
  fy: number;
  observer: ForceObserver;
  pitch: number;
  roll: number;
  spring: number;
  damping: number;
  cornering: number;
}

export interface ExplainerScene {
  update: (state: ExplainerState) => void;
  resetCamera: () => void;
  rotateCamera: () => void;
  kickBump: () => void;
  destroy: () => void;
}

const CYAN = 0x70e2dc;
const CORAL = 0xffa088;
const OUTLINE = 0x7a919a;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Browser-only, deliberately qualitative diagrams. Vehicle front is world -Z. */
export function createExplainerScene(
  canvas: HTMLCanvasElement,
  initialState: ExplainerState,
  onUnavailable?: () => void,
): ExplainerScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b1419);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 3.4;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.target.set(0, 0.4, 0);
  let state = initialState;
  let destroyed = false;
  let frame = 0;
  let bumpStarted = -Infinity;
  let previousTopic = state.topic;

  const ground = new THREE.GridHelper(12, 24, 0x284049, 0x182a33);
  ground.position.y = -0.025;
  scene.add(ground);

  function outlineBox(width: number, height: number, depth: number, color = OUTLINE) {
    const source = new THREE.BoxGeometry(width, height, depth);
    const geometry = new THREE.EdgesGeometry(source);
    source.dispose();
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color }));
  }

  function label(text: string, position: THREE.Vector3, color = '#91a9b4') {
    const bitmap = document.createElement('canvas');
    bitmap.width = 512;
    bitmap.height = 96;
    const context = bitmap.getContext('2d');
    if (!context) return;
    context.font = '600 32px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, 256, 48);
    const texture = new THREE.CanvasTexture(bitmap);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.copy(position);
    sprite.scale.set(2.7, 0.51, 1);
    scene.add(sprite);
  }

  label('FRONT  ↑', new THREE.Vector3(0, 0.05, -3.15));

  const grip = new THREE.Group();
  const tyre = new THREE.Group();
  const tyreGeometry = new THREE.CylinderGeometry(0.46, 0.46, 0.32, 32);
  tyreGeometry.rotateZ(Math.PI / 2);
  const tyreOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(tyreGeometry, 20),
    new THREE.LineBasicMaterial({ color: 0xb7c5ca }),
  );
  tyreOutline.position.y = 0.47;
  tyre.add(tyreOutline);
  const tyreFill = new THREE.Mesh(
    tyreGeometry,
    new THREE.MeshBasicMaterial({ color: 0x1a2e36, transparent: true, opacity: 0.65 }),
  );
  tyreFill.position.y = 0.47;
  tyre.add(tyreFill);
  grip.add(tyre);

  const circlePoints = Array.from({ length: 97 }, (_, index) => {
    const angle = index / 96 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * 1.8, 0.018, Math.sin(angle) * 1.8);
  });
  const budget = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(circlePoints),
    new THREE.LineDashedMaterial({ color: 0x4f7580, dashSize: 0.075, gapSize: 0.06 }),
  );
  budget.computeLineDistances();
  grip.add(budget);

  const roadOnTyre = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.16, 0), 1, CYAN, 0.23, 0.18);
  const tyreOnRoad = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.09, 0), 1, CORAL, 0.23, 0.18);
  grip.add(roadOnTyre, tyreOnRoad);
  scene.add(grip);

  const vehicle = new THREE.Group();
  const chassis = outlineBox(1.9, 0.62, 4.3);
  chassis.position.y = 1.03;
  vehicle.add(chassis);
  const spine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.35, -2.15), new THREE.Vector3(0, 1.35, 2.15)]),
    new THREE.LineDashedMaterial({ color: 0x49626c, dashSize: 0.13, gapSize: 0.09 }),
  );
  spine.computeLineDistances();
  vehicle.add(spine);
  const wheelCoordinates = [ [-1.13, -1.42], [1.13, -1.42], [-1.13, 1.42], [1.13, 1.42] ];
  const wheels = wheelCoordinates.map(([x, z]) => {
    const wheel = outlineBox(0.35, 0.7, 0.84, 0xa5b7be);
    wheel.position.set(x, 0.38, z);
    vehicle.add(wheel);
    return wheel;
  });
  scene.add(vehicle);

  const aero = new THREE.Group();
  // One small platform, centred within the chassis volume even at full teaching tilt.
  const platform = new THREE.Group();
  platform.add(outlineBox(0.68, 0.05, 0.8, CYAN));
  platform.position.y = 1.03;
  aero.add(platform);
  const platformMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.05, 0.8),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.42 }),
  );
  platform.add(platformMarker);
  const downforceArrows = wheelCoordinates.map(([x, z]) => {
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(x * 0.55, 2.3, z * 0.75), 0.7, CYAN, 0.18, 0.13);
    aero.add(arrow);
    return arrow;
  });
  scene.add(aero);

  const suspension = new THREE.Group();
  const springs = wheelCoordinates.map(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(65 * 3), 3));
    const spring = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: CYAN }));
    suspension.add(spring);
    return spring;
  });
  const antiRollBar = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.0, 0.65, -1.42), new THREE.Vector3(-0.77, 1.12, -1.42),
      new THREE.Vector3(0.77, 1.12, -1.42), new THREE.Vector3(1.0, 0.65, -1.42),
    ]),
    new THREE.LineBasicMaterial({ color: CORAL }),
  );
  suspension.add(antiRollBar);
  const bumpBlock = outlineBox(0.66, 0.18, 0.75, CORAL);
  bumpBlock.position.set(-1.13, 0.09, -1.42);
  suspension.add(bumpBlock);
  scene.add(suspension);

  function setArrowOpacity(arrow: THREE.ArrowHelper, opacity: number) {
    for (const material of [arrow.line.material, arrow.cone.material].flat()) {
      material.transparent = opacity < 1;
      material.opacity = opacity;
    }
  }

  function updateVisual(time: number) {
    grip.visible = state.topic === 'grip';
    vehicle.visible = state.topic !== 'grip';
    aero.visible = state.topic === 'aero';
    suspension.visible = state.topic === 'suspension';
    // Fx/Fy are already expressed in the chassis frame: never steer the force twice.
    const force = new THREE.Vector3(state.fy, 0, -state.fx);
    const magnitude = force.length();
    roadOnTyre.visible = tyreOnRoad.visible = magnitude > 0.001;
    if (magnitude > 0.001) {
      roadOnTyre.setDirection(force.clone().normalize());
      tyreOnRoad.setDirection(force.clone().normalize().negate());
      const length = magnitude * 1.8;
      const head = Math.min(0.23, length * 0.35);
      roadOnTyre.setLength(length, head, head * 0.78);
      tyreOnRoad.setLength(length, head, head * 0.78);
    }
    setArrowOpacity(roadOnTyre, state.observer === 'road' ? 0.22 : 1);
    setArrowOpacity(tyreOnRoad, state.observer === 'tyre' ? 0.22 : 1);
    // A positive right-hand steer rotates the -Z wheel heading towards +X.
    tyre.rotation.y = visualWheelRotationY(state.inputs.steering);

    // Keep the chassis fixed. Only the small inner platform and cue move.
    // Match the model: positive pitch is nose-down; positive roll lowers the left side.
    platform.rotation.set(-state.pitch * Math.PI / 180, 0, state.roll * Math.PI / 180);
    platform.position.set(-state.roll / 24 * 0.16, 1.03, -state.pitch / 24 * 0.4);
    const aeroLength = 0.3 + clamp(state.inputs.speed, 0, 300) ** 2 / 90000 * 1.05;
    downforceArrows.forEach((arrow) => arrow.setLength(aeroLength, 0.18, 0.13));

    const elapsed = (time - bumpStarted) / 1000;
    const bumpActive = state.topic === 'suspension' && elapsed >= 0 && elapsed < 3;
    const pulse = bumpActive
      ? 0.27 * (120 / state.spring) * Math.exp(-(1.6 + state.damping * 0.034) * elapsed) * Math.cos(elapsed * 17)
      : 0;
    const roll = state.topic === 'suspension' ? state.cornering * (120 / state.spring) * 0.13 : 0;
    chassis.rotation.z = roll * 0.65;
    wheels.forEach((wheel, index) => {
      wheel.position.y = 0.38 + (index === 0 ? pulse : 0);
      wheel.rotation.y = index < 2 ? visualWheelRotationY(state.inputs.steering) : 0;
      const [x, z] = wheelCoordinates[index];
      const railX = x < 0 ? -0.95 : 0.95;
      const topX = railX * Math.cos(chassis.rotation.z) - 0.31 * Math.sin(chassis.rotation.z);
      const topY = 1.03 + railX * Math.sin(chassis.rotation.z) + 0.31 * Math.cos(chassis.rotation.z);
      const bottom = wheel.position.y + 0.35;
      const positions = springs[index].geometry.getAttribute('position');
      for (let point = 0; point < 65; point++) {
        const progress = point / 64;
        const angle = progress * Math.PI * 12;
        // Taper each coil to exact wheel and outer-chassis attachment points.
        const radius = Math.sin(progress * Math.PI) * 0.1;
        positions.setXYZ(point,
          x + (topX - x) * progress + Math.cos(angle) * radius,
          bottom + (topY - bottom) * progress,
          z + Math.sin(angle) * radius);
      }
      positions.needsUpdate = true;
      springs[index].geometry.computeBoundingSphere();
    });
    bumpBlock.visible = bumpActive;
    return bumpActive;
  }

  function render(time: number) {
    frame = 0;
    if (destroyed) return;
    const animating = updateVisual(time);
    renderer.render(scene, camera);
    if (animating) requestRender();
  }

  function requestRender() {
    if (!destroyed && !frame) frame = requestAnimationFrame(render);
  }

  function resetCamera() {
    if (destroyed) return;
    camera.position.set(...(state.topic === 'grip' ? [3.6, 4.2, 4.7] : [5.2, 4.6, 6.3]) as [number, number, number]);
    controls.target.set(0, state.topic === 'grip' ? 0.3 : 0.7, 0);
    controls.update();
    requestRender();
  }

  function resize() {
    if (destroyed) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  controls.addEventListener('change', requestRender);

  function contextLost(event: Event) {
    event.preventDefault();
    destroy();
    onUnavailable?.();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    controls.removeEventListener('change', requestRender);
    controls.dispose();
    canvas.removeEventListener('webglcontextlost', contextLost);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    scene.traverse((object) => {
      const drawable = object as THREE.Mesh;
      if (drawable.geometry) geometries.add(drawable.geometry);
      const objectMaterials = drawable.material ? (Array.isArray(drawable.material) ? drawable.material : [drawable.material]) : [];
      objectMaterials.forEach((material) => {
        materials.add(material);
        if ('map' in material && material.map instanceof THREE.Texture) textures.add(material.map);
      });
    });
    textures.forEach((texture) => texture.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    scene.clear();
    renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
  }

  canvas.addEventListener('webglcontextlost', contextLost);
  resetCamera();
  resize();

  return {
    update(next) {
      if (destroyed) return;
      state = next;
      if (state.topic !== previousTopic) {
        previousTopic = state.topic;
        bumpStarted = -Infinity;
        resetCamera();
      }
      requestRender();
    },
    resetCamera,
    rotateCamera() {
      if (destroyed) return;
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      requestRender();
    },
    kickBump() {
      if (destroyed || state.topic !== 'suspension') return;
      bumpStarted = performance.now();
      requestRender();
    },
    destroy,
  };
}
