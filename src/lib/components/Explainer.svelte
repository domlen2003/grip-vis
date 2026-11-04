<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { aeroBox } from '../diagram.js';
  import {
    createExplainerScene,
    type DriverInputs,
    type ExplainerMetrics,
    type ExplainerScene,
    type ExplainerState,
    type ExplainerTopic,
    type ForceObserver,
  } from '../explainer-scene';

  let { topic, inputs, setup, metrics, onclose }: {
    topic: ExplainerTopic;
    inputs: DriverInputs;
    setup: Record<string, number>;
    metrics: ExplainerMetrics;
    onclose: () => void;
  } = $props();

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const topics = [
    { id: 'grip', number: '01', label: 'Tyre forces' },
    { id: 'aero', number: '02', label: 'Aero platform' },
    { id: 'suspension', number: '03', label: 'Suspension' },
  ] as const;
  const titles = {
    grip: 'One contact patch. Two force directions.',
    aero: 'Keep the platform in the picture.',
    suspension: 'A spring moves. A damper settles.',
  };
  const presets = [
    { name: 'Drive', fx: 0.8, fy: 0 },
    { name: 'Brake', fx: -0.8, fy: 0 },
    { name: 'Right turn', fx: 0, fy: 0.8 },
    { name: 'Combined', fx: -0.8, fy: 0.8 },
  ];
  let activeTopic = $state<ExplainerTopic>(untrack(() => topic));
  let fx = $state(untrack(() => clamp((inputs.throttle - inputs.brake) / 100, -1, 1)));
  let fy = $state(untrack(() => clamp(inputs.steering / 120, -1, 1)));
  let forceObserver = $state<ForceObserver>('both');
  let pitch = $state(untrack(() => aeroBox(metrics).pitchAngle));
  let roll = $state(untrack(() => aeroBox(metrics).rollAngle));
  let spring = $state(untrack(() => setup.frontSpring || 120));
  let damping = $state(untrack(() => setup.damping ?? 55));
  let cornering = $state(untrack(() => clamp(inputs.steering / 120, -1, 1)));
  let pulseCount = $state(0);
  let unavailable = $state(false);
  let engine: ExplainerScene | undefined;
  let dialog: HTMLDialogElement;
  let canvas: HTMLCanvasElement;
  let closed = false;
  const usage = $derived(Math.hypot(fx, fy));
  const sceneState: ExplainerState = $derived({
    topic: activeTopic, inputs, fx, fy, observer: forceObserver, pitch, roll, spring, damping, cornering,
  });

  // Attachments run after mount and whenever their reactive scene state changes.
  // The WebGL renderer itself is created once, in onMount.
  function attachCanvas(node: HTMLCanvasElement) {
    canvas = node;
    const nextState = sceneState;
    engine?.update(nextState);
  }

  function attachDialog(node: HTMLDialogElement) {
    dialog = node;
  }

  function finishClose() {
    if (closed) return;
    closed = true;
    engine?.destroy();
    onclose();
  }

  function pulseBump() {
    pulseCount += 1;
    engine?.kickBump();
  }

  onMount(() => {
    dialog.showModal();
    try {
      engine = createExplainerScene(canvas, untrack(() => sceneState), () => { unavailable = true; });
    } catch {
      unavailable = true;
    }
    return () => {
      closed = true;
      engine?.destroy();
      if (dialog.open) dialog.close();
    };
  });
</script>

<dialog {@attach attachDialog} class="explainer" aria-labelledby="explainer-title" onclose={finishClose}>
  <header>
    <div class="eyebrow">THE SETUP NOTEBOOK <span>INTERACTIVE EXPLAINER</span></div>
    <form method="dialog"><button class="close" aria-label="Close explainer" value="close">×</button></form>
    <nav aria-label="Explainer topics">
      {#each topics as item (item.id)}
        <button type="button" class={{ active: activeTopic === item.id }} aria-pressed={activeTopic === item.id} onclick={() => { activeTopic = item.id; }}>
          <span>{item.number}</span>{item.label}
        </button>
      {/each}
    </nav>
    <h2 id="explainer-title">{titles[activeTopic]}</h2>
    <p class="intro">{activeTopic === 'grip' ? 'Build a requested force vector, then look at the equal and opposite force on the road.' : activeTopic === 'aero' ? 'A simple wireframe separates the chassis from a small, moving platform cue inside it.' : 'Explore a local bump and see how stiffness and damping change this illustrative response.'}</p>
  </header>

  <div class="body">
    <section class="visual" aria-label="Interactive three dimensional diagram">
      <div class="stage">
        <canvas {@attach attachCanvas} aria-label={activeTopic === 'grip' ? 'A tyre with cyan requested road-on-tyre force and an equal opposite coral tyre-on-road force. Front points towards the FRONT label.' : activeTopic === 'aero' ? 'A wireframe chassis with a small cyan platform inside and downward aero arrows.' : 'A wireframe chassis with four wheels, cyan springs and a coral front anti-roll bar.'}>
          The diagram is also described in the controls and notes beside it.
        </canvas>
        <div class="scene-label"><span class="live-dot"></span>{activeTopic === 'grip' ? 'CONTACT PATCH / CHASSIS AXES' : activeTopic === 'aero' ? 'PLATFORM / QUALITATIVE CUE' : 'FRONT-LEFT / HEURISTIC PULSE'}</div>
        {#if unavailable}
          <div class="fallback"><strong>3D view is unavailable</strong><p>The controls, force diagram and explanations still work. Your browser could not create a WebGL view.</p></div>
        {/if}
        {#if activeTopic === 'grip'}
          <div class="force-inset">
            <svg viewBox="0 0 180 180" role="img" aria-label={`Requested force: Fx ${fx.toFixed(2)}, Fy ${fy.toFixed(2)}. Demand is ${(usage * 100).toFixed(0)} percent of the assumed normalized budget.`}>
              <defs>
                <marker id="explainer-force-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6z" fill="#70e2dc" /></marker>
                <marker id="explainer-reaction-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6z" fill="#ffa088" /></marker>
              </defs>
              <circle class="budget" cx="90" cy="90" r="55" />
              <path class="axes" d="M90 22V158M22 90H158" />
              <text x="90" y="14" text-anchor="middle">+Fx · forward</text>
              <text x="90" y="174" text-anchor="middle">−Fx · brake</text>
              <text x="174" y="82" text-anchor="end">+Fy</text>
              <text x="174" y="105" text-anchor="end">right →</text>
              <line x1="90" y1="90" x2={90 - fy * 55} y2={90 + fx * 55} stroke="#ffa088" stroke-width="2" opacity={forceObserver === 'tyre' ? 0.24 : 1} marker-end="url(#explainer-reaction-head)" />
              <line x1="90" y1="90" x2={90 + fy * 55} y2={90 - fx * 55} stroke="#70e2dc" stroke-width="2.5" opacity={forceObserver === 'road' ? 0.24 : 1} marker-end="url(#explainer-force-head)" />
              <circle cx="90" cy="90" r="3" fill="#d8e4e8" />
            </svg>
          </div>
        {/if}
      </div>
      <div class="camera-tools">
        <span>Drag to orbit · scroll to zoom</span>
        <div><button type="button" onclick={() => engine?.rotateCamera()} disabled={unavailable}>Rotate view</button><button type="button" onclick={() => engine?.resetCamera()} disabled={unavailable}>Reset camera</button></div>
      </div>
      <div class="legend">
        {#if activeTopic === 'grip'}
          <span><i class="cyan"></i>Road → tyre</span><span><i class="coral"></i>Tyre → road</span><span><i class="outline"></i>Assumed budget</span>
        {:else if activeTopic === 'aero'}
          <span><i class="cyan"></i>Inner platform + aero load cue</span><span><i class="outline"></i>Fixed chassis</span>
        {:else}
          <span><i class="cyan"></i>Springs</span><span><i class="coral"></i>Front anti-roll bar / bump</span>
        {/if}
      </div>
    </section>

    <section class="controls" aria-label="Explainer controls">
      {#if activeTopic === 'grip'}
        <div class="section-label">REQUESTED FORCE / NORMALIZED</div>
        <div class="presets" aria-label="Force presets">
          {#each presets as preset (preset.name)}
            <button type="button" onclick={() => { fx = preset.fx; fy = preset.fy; }}>{preset.name}</button>
          {/each}
        </div>
        <label class="slider" for="explainer-fx"><span>Longitudinal <b>Fx</b><output>{fx.toFixed(2)}</output></span><input id="explainer-fx" type="range" min="-1" max="1" step="0.01" bind:value={fx} /><small><span>− Brake</span><span>Drive +</span></small></label>
        <label class="slider" for="explainer-fy"><span>Lateral <b>Fy</b><output>{fy.toFixed(2)}</output></span><input id="explainer-fy" type="range" min="-1" max="1" step="0.01" bind:value={fy} /><small><span>− Left</span><span>Right +</span></small></label>
        <label class="select-label" for="force-observer">Highlight force on<select id="force-observer" bind:value={forceObserver}><option value="both">Both bodies</option><option value="tyre">Tyre · road → tyre</option><option value="road">Road · tyre → road</option></select></label>
        <div class={['readout', { warning: usage > 1 }]}><div><span>Requested combined demand</span><strong>{(usage * 100).toFixed(0)}<small>%</small></strong></div><div class="budget-bar"><span style:width={`${Math.min(100, usage * 100)}%`}></span></div><p>√(Fx² + Fy²) = {usage.toFixed(2)} · assumed budget = 1.00</p></div>
        <p class="note">{usage > 1 ? 'This request exceeds the assumed circle. The arrow shows demand; it does not mean the tyre can deliver it.' : 'Drive, braking and cornering share this assumed force budget. Combining them uses the same circle.'}</p>
        <p class="detail">Cyan is the requested force of the road on the tyre. Coral is its equal and opposite reaction on the road. The dashed circle is a teaching assumption, not measured tyre grip. Wheel steer is shown separately; Fx and Fy stay in the chassis axes.</p>
      {:else if activeTopic === 'aero'}
        <div class="section-label">MOVE THE INNER PLATFORM</div>
        <label class="slider" for="explainer-pitch"><span>Pitch cue<output>{pitch.toFixed(1)}°</output></span><input id="explainer-pitch" type="range" min="-24" max="24" step="0.1" bind:value={pitch} /><small><span>Nose up</span><span>Nose down</span></small></label>
        <label class="slider" for="explainer-roll"><span>Roll cue<output>{roll.toFixed(1)}°</output></span><input id="explainer-roll" type="range" min="-24" max="24" step="0.1" bind:value={roll} /><small><span>Right side down</span><span>Left side down</span></small></label>
        <div class="metric-pair"><div><span>Current model downforce</span><strong>{Math.round(Number(metrics.downforceN) || 0).toLocaleString()}<small>N</small></strong></div><div><span>Current speed</span><strong>{Math.round(inputs.speed)}<small>km/h</small></strong></div></div>
        <p class="note">Ride height, pitch and roll change how a car presents its floor and wings to the airflow.</p>
        <p class="detail">The small cyan box shifts and pivots inside the fixed chassis. Tilt is exaggerated to make it visible; its position is not a calculated centre of pressure. These local controls do not change the main setup or its downforce readout.</p>
        <p class="detail">The arrows indicate downward aero loading. The model adds that vertical load once, before comparing requested tyre forces with its assumed capacity.</p>
      {:else}
        <div class="section-label">LOCAL RESPONSE / FRONT AXLE</div>
        <label class="slider" for="explainer-spring"><span>Front spring<output>{spring}<small>N/mm</small></output></span><input id="explainer-spring" type="range" min="60" max="240" step="5" bind:value={spring} /><small><span>Softer · more displacement</span><span>Stiffer</span></small></label>
        <label class="slider" for="explainer-damping"><span>Bump damping<output>{damping}<small>index</small></output></span><input id="explainer-damping" type="range" min="0" max="100" step="1" bind:value={damping} /><small><span>Longer visible oscillation</span><span>Faster decay</span></small></label>
        <label class="slider" for="explainer-corner"><span>Cornering cue<output>{cornering.toFixed(2)}</output></span><input id="explainer-corner" type="range" min="-1" max="1" step="0.01" bind:value={cornering} /><small><span>Left turn</span><span>Right turn</span></small></label>
        <button class="bump-button" type="button" onclick={pulseBump} disabled={unavailable}>↟ Pulse front-left bump</button>
        <span class="pulse-status" role="status">{pulseCount ? `Pulse ${pulseCount} · three-second illustrative decay` : 'Run a pulse, then compare damping settings.'}</span>
        <p class="note">Stiffness changes displacement. Damping changes the transient response and dissipates motion.</p>
        <p class="detail">Acceleration, mass and geometry determine total load transfer. Springs and anti-roll bars influence its distribution and the platform’s motion; a stiffer spring does not directly mean less grip.</p>
        <p class="detail">The pulse is a damped visual cue, not a suspension solver or a prediction of tyre contact. These local controls leave the main setup unchanged.</p>
      {/if}
    </section>
  </div>
  <footer><span class="footer-mark">LEARN THE RELATIONSHIP</span><span>Generic GT illustration · fictional coefficients · no telemetry</span><span>Esc to close</span></footer>
</dialog>

<style>
  .explainer { box-sizing: border-box; width: min(1100px, calc(100vw - 40px)); max-height: calc(100dvh - 40px); padding: 0; border: 1px solid #36464e; border-radius: 18px; background: #101a20; color: #edf3f6; font-family: inherit; box-shadow: 0 30px 100px #0009; overflow: auto; color-scheme: dark; }
  .explainer::backdrop { background: #02080dc9; backdrop-filter: blur(8px); }
  header { position: relative; padding: 27px 30px 20px; border-bottom: 1px solid #2a3941; }
  .eyebrow, .section-label, .scene-label, .footer-mark { font-size: 10px; font-weight: 700; letter-spacing: 0.13em; }
  .eyebrow { color: #70e2dc; padding-right: 35px; }.eyebrow span { color: #81959f; margin-left: 18px; }
  .close { position: absolute; top: 17px; right: 20px; width: 36px; height: 36px; font: 27px/1 inherit; border: 1px solid #3b4b53; border-radius: 50%; color: #dce9ed; background: transparent; }
  nav { display: flex; gap: 7px; margin: 25px 0 20px; flex-wrap: wrap; }
  button { cursor: pointer; font: inherit; }button:disabled { cursor: default; opacity: 0.4; }button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #a3f7ee; outline-offset: 4px; }
  nav button { border: 1px solid #34454f; border-radius: 6px; background: transparent; color: #a4b7c0; padding: 9px 13px; font-size: 12px; }nav button span { font-size: 10px; margin-right: 9px; color: #748c98; }nav button.active { color: #c9fff7; border-color: #629d9c; background: #173137; }nav button.active span { color: #70e2dc; }
  h2 { font-size: clamp(22px, 2.7vw, 31px); font-weight: 550; letter-spacing: -0.035em; margin: 0 0 9px; line-height: 1.2; }
  p { margin: 0; }.intro { color: #9eb1bc; font-size: 13px; line-height: 1.65; max-width: 760px; }
  .body { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(290px, 1fr); }.visual { min-width: 0; padding: 18px; border-right: 1px solid #2a3941; }.stage { position: relative; height: 408px; border: 1px solid #293e48; border-radius: 10px; overflow: hidden; background: #0b1419; }canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }canvas:active { cursor: grabbing; }
  .scene-label { position: absolute; top: 16px; left: 16px; color: #83a1af; font-size: 8px; pointer-events: none; }.live-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #70e2dc; margin-right: 8px; vertical-align: 1px; }
  .fallback { position: absolute; top: 65px; left: 10%; right: 10%; padding: 19px; background: #17252df5; border: 1px solid #49616d; border-radius: 8px; text-align: center; font-size: 14px; }.fallback p { margin-top: 8px; color: #afc2cb; font-size: 12px; line-height: 1.6; }
  .force-inset { position: absolute; bottom: 10px; left: 10px; width: 154px; height: 154px; border: 1px solid #2a414b; border-radius: 8px; background: #0b1419e8; pointer-events: none; }.force-inset svg { width: 100%; height: 100%; }.force-inset text { fill: #9bb3bf; font: 8px system-ui, sans-serif; }.budget { fill: none; stroke: #4f7580; stroke-width: 1; stroke-dasharray: 3 4; }.axes { fill: none; stroke: #344b57; stroke-width: 1; }
  .camera-tools { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; color: #879faa; font-size: 10px; }.camera-tools div { display: flex; gap: 7px; }.camera-tools button { border: 1px solid #354a55; border-radius: 4px; padding: 6px 8px; background: transparent; color: #c4d5dd; font-size: 10px; }.camera-tools button:hover:not(:disabled) { background: #1a303b; }
  .legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 17px 1px 2px; color: #a5bbc6; font-size: 10px; }.legend span { display: inline-flex; align-items: center; gap: 6px; }.legend i { display: inline-block; width: 10px; height: 3px; border-radius: 1px; }.cyan { background: #70e2dc; }.coral { background: #ffa088; }.outline { border-top: 1px dashed #7096a4; }
  .controls { padding: 24px 28px 22px; min-width: 0; }.section-label { color: #849fab; font-size: 9px; margin-bottom: 17px; }.presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin: 0 0 20px; }.presets button { border: 1px solid #38505b; border-radius: 4px; background: #142630; color: #bfd3de; padding: 7px 3px; font-size: 10px; }.presets button:hover { border-color: #70e2dc; color: #d6fff9; }
  .slider { display: block; margin: 0 0 17px; }.slider > span { display: flex; align-items: baseline; color: #c6d6de; font-size: 12px; }.slider b { font-size: 10px; font-weight: 500; color: #809ba9; margin-left: 5px; }.slider output { margin-left: auto; font-size: 13px; font-variant-numeric: tabular-nums; color: #d2faf5; }.slider output small { margin-left: 5px; font-size: 9px; color: #8ea7b3; }.slider input { display: block; width: 100%; height: 15px; margin: 10px 0 5px; accent-color: #70d4cf; cursor: pointer; }.slider > small { display: flex; justify-content: space-between; color: #819aa7; font-size: 9px; }
  .select-label { display: flex; align-items: center; gap: 9px; color: #98b0bd; font-size: 10px; margin: 18px 0; }.select-label select { flex: 1; min-width: 0; background: #13242d; border: 1px solid #3d5662; border-radius: 4px; color: #c6dfe7; font: inherit; padding: 7px; }
  .readout { padding: 13px 15px; border: 1px solid #345753; border-radius: 7px; background: #112b2b; margin: 20px 0 15px; }.readout > div:first-child { display: flex; align-items: center; justify-content: space-between; }.readout span { color: #a6c5c3; font-size: 10px; }.readout strong { color: #b5f4e9; font-size: 24px; font-weight: 500; font-variant-numeric: tabular-nums; }.readout strong small { font-size: 12px; margin-left: 3px; }.budget-bar { height: 3px; background: #2a4848; margin: 9px 0; overflow: hidden; border-radius: 4px; }.budget-bar span { display: block; height: 100%; background: #70e2dc; }.readout p { color: #89aeac; font-size: 9px; }.readout.warning { background: #30251f; border-color: #785342; }.readout.warning strong { color: #ffb99b; }.readout.warning .budget-bar span { background: #ffa088; }.readout.warning p { color: #d4a58f; }
  .note { color: #c7d9e2; font-size: 12px; line-height: 1.65; margin: 16px 0 10px; }.detail { color: #879fac; font-size: 10px; line-height: 1.8; margin-top: 11px; }.metric-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 15px 0; margin-top: 22px; border-top: 1px solid #30444f; border-bottom: 1px solid #30444f; }.metric-pair span { display: block; color: #8ca8b6; font-size: 9px; margin-bottom: 7px; }.metric-pair strong { color: #c0ece8; font-size: 23px; font-weight: 500; }.metric-pair strong small { color: #7f9eab; margin-left: 4px; font-size: 10px; }.bump-button { width: 100%; padding: 10px 12px; background: #1d393d; border: 1px solid #548d89; border-radius: 5px; color: #bff6ed; font-size: 11px; }.bump-button:hover:not(:disabled) { background: #285155; }.pulse-status { display: block; color: #839fae; font-size: 9px; margin-top: 9px; }
  footer { display: flex; justify-content: space-between; gap: 15px; padding: 15px 28px; color: #6e8a9b; background: #0e1921; border-top: 1px solid #2a3941; font-size: 9px; }.footer-mark { color: #82a3af; font-size: 8px; }
  @media (max-width: 760px) { .explainer { width: calc(100vw - 20px); max-height: calc(100dvh - 20px); border-radius: 12px; }header { padding: 23px 20px 18px; }.eyebrow span { display: block; margin: 7px 0 0; font-size: 8px; }nav { margin-top: 20px; gap: 5px; }nav button { padding: 8px 9px; font-size: 10px; }nav button span { margin-right: 5px; }.body { grid-template-columns: 1fr; }.visual { border-right: 0; border-bottom: 1px solid #2a3941; padding: 12px; }.stage { height: 320px; }.controls { padding: 23px; }.force-inset { width: 130px; height: 130px; }.camera-tools { font-size: 9px; }footer { flex-wrap: wrap; padding: 15px 20px; }footer > span:last-child { display: none; } }
</style>
