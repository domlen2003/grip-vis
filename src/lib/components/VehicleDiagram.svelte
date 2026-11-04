<script lang="ts">
  import type { evaluate } from '../model.js';
  import { CHASSIS, WHEEL_POSITIONS, SPRING_ANCHORS, aeroBox, envelopeRadius, plotForce, visualWheelAngle, springPath } from '../diagram.js';
  type Result = ReturnType<typeof evaluate>;
  let { result, baseline = null, steering, bumpActive = false }: {
    result: Result; baseline?: Result | null; steering: number; bumpActive?: boolean;
  } = $props();
  const box = $derived(aeroBox(result.metrics));
  const positions: Record<string, readonly number[]> = WHEEL_POSITIONS;
  const anchors: Record<string, readonly number[]> = SPRING_ANCHORS;
  // Single exterior envelope, hand-traced from the VELOREX 296 GT3 orthographic render.
  // References and the rear-wing gap simplification: research/car-outline/README.md.
  const ferrariOutline = 'M 340.0 171.1 C 325.6 171.1 320.0 172.3 313.2 174.3 C 302.8 177.9 292.8 183.9 285.2 192.3 Q 278.0 201.1 278.0 211.5 L 278.0 235.1 L 278.0 277.9 L 279.2 280.3 L 279.6 285.9 L 275.2 285.9 Q 269.2 286.7 268.4 290.3 Q 267.6 293.9 268.8 296.7 L 276.0 293.9 L 280.0 291.9 L 280.4 303.5 C 280.0 324.7 279.6 348.3 278.8 366.3 Q 278.0 385.5 278.0 408.7 L 278.0 439.9 L 278.4 446.7 L 279.6 449.1 L 280.4 451.9 L 280.4 471.5 L 400.0 471.5 L 400.0 451.9 L 401.6 449.1 Q 403.2 429.9 402.0 408.7 Q 402.0 385.1 400.8 358.7 L 400.4 303.5 L 400.0 292.3 L 404.0 293.5 L 410.8 296.7 Q 413.2 291.1 410.4 287.1 L 403.2 284.7 L 400.0 285.1 L 400.4 279.5 L 402.4 277.5 L 402.0 235.1 L 402.0 211.9 Q 402.0 200.3 395.2 192.3 C 386.4 183.1 376.0 175.9 366.4 172.7 C 357.2 170.7 348.8 171.1 340.0 171.1 Z';
</script>

<div class="diagram-wrap">
  <svg id="dynamics-diagram" viewBox="0 0 680 636" role="img" aria-labelledby="diagram-title diagram-description">
    <title id="diagram-title">Tyre force demand around a Ferrari 296 GT3 exterior outline</title>
    <desc id="diagram-description">One continuous line traces the fixed car perimeter. Springs attach to that perimeter. The small blue platform is inside the car, shifting and pivoting with setup and driving conditions. Front-wheel steering and platform tilt are exaggerated for visibility. Tyre dots show requested road-on-tyre force: drive up, brake down, left force left, right force right.</desc>
    <defs>
      <pattern id="stage-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#fff" stroke-opacity=".022" /></pattern>
      <linearGradient id="aero-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#79c9d8" stop-opacity=".16" /><stop offset="1" stop-color="#79c9d8" stop-opacity=".03" /></linearGradient>
    </defs>
    <rect width="680" height="636" fill="url(#stage-grid)" />
    <path d="M340 44v28m-5-6 5 6 5-6" class="front-arrow" />
    <text x="340" y="32" class="axis-label" text-anchor="middle">FRONT / +Fx</text>
    <path d="M340 90V153M340 486V500" class="center-line" fill="none" />

    <g id="suspension-lines">
      {#each result.wheels as wheel (wheel.id)}
        {@const start = [wheel.id.endsWith('L') ? 222 : 458, positions[wheel.id][1]]}
        {@const anchor = anchors[wheel.id]}
        <path class={["spring-line", { engaged: wheel.stopEngaged }]} data-anchor="chassis" data-wheel={wheel.id}
          d={springPath(start, anchor, wheel.compressionMm)} />
        <rect class="spring-anchor" x={anchor[0] - 3} y={anchor[1] - 3} width="6" height="6" rx="1" />
      {/each}
    </g>

    <g id="vehicle-body">
      <path id="car-outline" d={ferrariOutline} fill="none" stroke="#c4ced1" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />

      <g id="aero-platform" data-offset-x={box.dx.toFixed(2)} data-offset-y={box.dy.toFixed(2)}
        data-pitch={box.pitchAngle.toFixed(2)} data-roll={box.rollAngle.toFixed(2)}
        data-corners={JSON.stringify(box.corners)}>
        <path d={`M${CHASSIS.centerX} ${CHASSIS.centerY}L${box.cx} ${box.cy}`} stroke="#86c8d3" stroke-opacity=".4" stroke-dasharray="2 3" />
        <path id="aero-box" d={box.path} fill="url(#aero-gradient)" stroke="#86c8d3" stroke-width="1.5" />
        <path d={`M${box.cx - 5} ${box.cy}H${box.cx + 5}M${box.cx} ${box.cy - 5}V${box.cy + 5}`}
          stroke="#c3e7eb" stroke-width="1" />
        <circle cx={box.pivot.x} cy={box.pivot.y} r="2.3" fill="#c3e7eb" />
        <text x={box.cx} y={box.cy - 16} text-anchor="middle" class="aero-box-label">AERO</text>
      </g>

      <g id="front-wheel-left" transform={`rotate(${visualWheelAngle(steering)} 287 235.1)`}>
        <rect x="280" y="218.1" width="14" height="34" rx="3" class="actual-wheel" />
      </g>
      <g id="front-wheel-right" transform={`rotate(${visualWheelAngle(steering)} 393 235.1)`}>
        <rect x="386" y="218.1" width="14" height="34" rx="3" class="actual-wheel" />
      </g>
      <rect x="280" y="391.7" width="14" height="34" rx="3" class="actual-wheel" />
      <rect x="386" y="391.7" width="14" height="34" rx="3" class="actual-wheel" />
    </g>

    <g id="wheel-diagrams">
      {#each result.wheels as wheel (wheel.id)}
        {@const center = positions[wheel.id]}
        {@const radius = envelopeRadius(wheel.capacityN)}
        {@const naturalRadius = envelopeRadius(wheel.mechanicalCapacityN)}
        {@const aeroLoss = wheel.aeroCapacityN < 0}
        {@const point = plotForce(wheel, radius)}
        {@const reference = baseline?.wheels.find((candidate) => candidate.id === wheel.id)}
        <g id={`wheel-${wheel.id}`} transform={`translate(${center[0]} ${center[1]})`}>
          <title>{wheel.id}: {(wheel.capacityN / 1000).toFixed(2)} kN total assumed capacity; {(wheel.mechanicalCapacityN / 1000).toFixed(2)} kN natural mechanical reference without vertical aero load at the same inputs; {wheel.aeroCapacityN >= 0 ? '+' : ''}{(wheel.aeroCapacityN / 1000).toFixed(2)} kN aero effect.{aeroLoss ? ' The bump heuristic changes load redistribution in this comparison.' : ''}</title>
          <text class="wheel-code" x="-104" y="-104">{wheel.id}</text>
          <path class="wheel-axis" d="M-80 0H80M0-80V80" />
          {#if Math.abs(radius - naturalRadius) > 0.001}
            <circle class={['wheel-aero-band', { 'aero-loss': aeroLoss }]} r={(radius + naturalRadius) / 2}
              stroke-width={Math.abs(radius - naturalRadius)} data-aero-capacity-n={wheel.aeroCapacityN} />
          {/if}
          <circle class="wheel-natural-envelope" r={naturalRadius} data-mechanical-capacity-n={wheel.mechanicalCapacityN} />
          <circle class={["wheel-envelope", { warning: wheel.utilization > 1 }]} r={radius} data-capacity-n={wheel.capacityN} />
          <text class="force-axis-label" x="0" y="-55" text-anchor="middle">DRIVE</text>
          <text class="force-axis-label" x="0" y="58" text-anchor="middle">BRAKE</text>
          <text class="force-axis-label" x="-86" y="3" text-anchor="end">−Fy</text>
          <text class="force-axis-label" x="86" y="3">+Fy</text>
          {#if reference}
            {@const referenceRadius = envelopeRadius(reference.capacityN)}
            {@const referencePoint = plotForce(reference, referenceRadius)}
            <circle class="wheel-baseline-envelope" r={referenceRadius} />
            <circle class="wheel-baseline-dot" r="3" cx={referencePoint.x} cy={referencePoint.y} />
          {/if}
          <line class="wheel-demand-line" x1="0" y1="0" x2={point.x} y2={point.y} />
          <circle class="wheel-demand" r="4.3" cx={point.x} cy={point.y} data-force-x={wheel.fxN.toFixed(1)} data-force-y={wheel.fyN.toFixed(1)} />
          <text class="wheel-load" x="0" y="116" text-anchor="middle">{(wheel.capacityN / 1000).toFixed(2)} kN capacity</text>
          <text class="wheel-capacity-split" x="0" y="131" text-anchor="middle"><tspan class="natural-value">{(wheel.mechanicalCapacityN / 1000).toFixed(2)} natural</tspan><tspan dx="4" class={['aero-value', { 'loss-value': aeroLoss }]}>{aeroLoss ? '−' : '+'} {Math.abs(wheel.aeroCapacityN / 1000).toFixed(2)} aero</tspan><tspan dx="3" class="capacity-unit">kN</tspan></text>
          <text class="wheel-usage" x="0" y="146" text-anchor="middle">{(wheel.loadN / 1000).toFixed(2)} kN load · {Math.round(wheel.utilization * 100)}% demand</text>
        </g>
      {/each}
    </g>
    <text x="340" y="502" class="diagram-small" text-anchor="middle">STEERING + PLATFORM TILT EXAGGERATED</text>
    <text x="340" y="523" class="platform-value" text-anchor="middle">{result.metrics.rakeMm.toFixed(1)} mm dynamic rake</text>
    <text x="340" y="544" class="diagram-small" text-anchor="middle">296 GT3 OUTLINE · GENERIC GT MODEL</text>
    <text x="340" y="606" class="axis-label" text-anchor="middle">REAR AXLE · DRIVEN</text>
  </svg>
  <span class={["bump-flash", { active: bumpActive }]}>FL BUMP INPUT</span>
</div>

<style>
  .force-axis-label { font: 6.5px var(--mono); fill: #778a91; }
  .aero-box-label { font: 8px var(--mono); letter-spacing: 2px; fill: #a5d3dd; }
  .wheel-natural-envelope { fill: none; stroke: #c8c5ac; stroke-width: 1.2; stroke-dasharray: 4 3; }
  .wheel-aero-band { fill: none; stroke: #69d9df; stroke-opacity: .2; }
  .wheel-aero-band.aero-loss { stroke: #ff946b; stroke-opacity: .28; }
  .wheel-capacity-split { font: 9px var(--mono); }
  .natural-value { fill: #c8c5ac; }
  .aero-value { fill: #86d6df; }
  .aero-value.loss-value { fill: #ff946b; }
  .capacity-unit { fill: #798b90; }
  @media(max-width:680px) { .force-axis-label { font-size: 9px; } }
  @media(max-width:680px) { .wheel-capacity-split { font-size: 12px; } }
</style>
