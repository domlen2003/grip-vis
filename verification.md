# Local SvelteKit verification

Checked 2026-10-30 on Node 24.10.0. This records software checks, not vehicle calibration or simulator integration.

## Automated checks

- `npm run check`: **0 errors, 0 warnings**.
- `npm test`: **47 passed, 0 failed** (27 model and 20 diagram tests).
- `npm run build`: successful SvelteKit production build with adapter-node.
- `git diff --check`: clean.
- Official Svelte MCP autofixer: no issues or suggestions in the changed page, diagram, player and explainer components.

Coverage includes conservation, symmetry, force signs, load sensitivity, continuously increasing capacity through the last wing/speed increments, mechanical/aero attribution at the same inputs, signed bump differences, platform placement/pivot, exaggerated visual steering, finite scenarios, trace validation, interpolation, session v3 and v2 migration. Nonmanual saved controls are sampled at the saved/clamped playhead; manual controls are preserved.

Regression assertions failed before the corresponding fixes: outline clearance, over-demand dots outside rings larger than 92 px, exaggerated steering/platform pivot, and saved control/playhead consistency.

The Three.js/explainer chunk remains approximately 585 kB minified (147 kB compressed), producing a build size advisory. It loads on demand. No publishing configuration or source push was used.

## Rendered browser checks

Playwright drove accessible controls and native range-keyboard interactions. Chrome DevTools MCP was unavailable. Final smoke checks used the Node production build at `http://127.0.0.1:4173`, with **0 browser errors and 0 warnings**.

Verified during this revision:

1. The main car exterior is one closed path traced from the archived overhead Ferrari 296 GT3 reference. There is no additional chassis rectangle. Springs meet the perimeter at the axle positions. The generic force model remains unchanged by the visual reference.
2. Front-wheel display steering is about 18.6° at 20° input and reaches ±40°. The car stays fixed. Aero-box corners lie inside the actual SVG body path; the box is a descendant of the vehicle group.
3. Front/rear ride heights change platform position and pitch. Wing changes move the cue throughout its range. Pitch/roll alter its projected shape around the centre.
4. Every wing step 0–12 at 300 km/h increases all four displayed radii; speed increments including 299→300 km/h increase them too. No per-wheel ceiling or automatic rescaling is applied.
5. Natural mechanical rings, total rings, aero annuli and numeric breakdowns agree. At zero speed the natural and total rings coincide. A donor-limited FL bump preserves a signed negative effect: the FR total ring can be zero while the mechanical ring is nonzero and the loss band remains visible.
6. Trail braking shows approach, braking, apex and exit acceleration. At 8 s the clip gives 95 km/h with brake released; it stops at 16 s with 190 km/h and 100% throttle. Replay starts from zero.
7. The Daytona-style synthetic chicane changes from left to right steering. Scrubbing changes current controls and phase, and pauses playback.
8. A synthetic JSON trace imports, seeks and reaches its exact endpoint. Actual session export/download, reset/re-import and reload preserve the trace, playhead, inputs and pinned setup. An incompatible trace is rejected without replacing it.
9. The Three.js explainer creates a real WebGL2 canvas, supports topics/camera/controls and closes cleanly. The small aero platform sits inside the fixed wireframe at full teaching tilt. Context-loss fallback/recovery and repeated close/reopen were also exercised during the migration.
10. Widths 1440, 970, 768, 681 and 390 have no horizontal document, panel or player overflow. Phone/tablet layouts and native controls were inspected.

## Historical evidence and review

The browser checks below were recorded in the original working archive on 2026-10-30. UI screenshots and raw media are not distributed in this code-only copy; fresh copy checks are recorded in [clean-copy.md](docs/clean-copy.md).

- [Overhead references and provenance](research/car-outline/README.md)
- [Synthetic trace fixture](tests/fixtures/scenario-example.json)

Independent reviews identified and rechecked geometry, large-ring demand clipping and saved phase/control consistency. The reported issues were corrected; no remaining important issue was reported in the reviewed scope.

The mechanical comparison removes only vertical downforce while retaining the same speed, controls, setup, drag and transient timing. Aero contribution is the nonlinear difference from total capacity, not an extra friction multiplier. Negative per-wheel differences during the heuristic bump are preserved and are not evidence of physical aero grip loss.

The built-in clips are synthetic; a recorded trace supplies controls, not measured grip. Native iRacing IBT import, SimHub capture, real car constraints and empirical calibration remain future work in the [Windows roadmap](docs/windows-sim-agent-roadmap.md). See [README](README.md) for strict JSON trace units and limits.
