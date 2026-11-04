<script lang="ts">
  type Sample = { time: number; speed: number; throttle: number; brake: number; steering: number };
  let { title, duration, time, running, phase, sourceLabel, samples, onseek, onplay, onrestart, onimport, disabled = false }: {
    title: string;
    duration: number;
    time: number;
    running: boolean;
    phase: string;
    sourceLabel: string;
    samples: readonly Sample[];
    onseek: (time: number) => void;
    onplay: () => void;
    onrestart: () => void;
    onimport: (event: Event) => void;
    disabled?: boolean;
  } = $props();

  const uid = $props.id();
  const inactive = $derived(disabled || duration <= 0);
  const position = $derived(Math.max(0, Math.min(duration, time)));
  const progress = $derived(duration > 0 ? position / duration : 0);
  const finished = $derived(duration > 0 && position >= duration);
  const channels = [
    { key: 'speed', label: 'Speed', range: '0–300 km/h', color: '#d7deda' },
    { key: 'throttle', label: 'Throttle', range: '0–100%', color: '#aec494' },
    { key: 'brake', label: 'Brake', range: '0–100%', color: '#ff946b' },
    { key: 'steering', label: 'Steering', range: '−120–120°', color: '#86c8d3' },
  ] as const;
  // The overview is sampled for drawing only; seeking/playback use the original trace.
  const plotSamples = $derived.by(() => {
    const stride = Math.max(1, Math.ceil(samples.length / 2000));
    return samples.filter((_, index) => index % stride === 0 || index === samples.length - 1);
  });
  const traces = $derived(channels.map((channel) => ({
    ...channel,
    path: plotSamples.map((sample, index) => {
      const normalized = channel.key === 'speed' ? sample.speed / 300
        : channel.key === 'steering' ? (sample.steering + 120) / 240 : sample[channel.key] / 100;
      const x = duration > 0 ? sample.time / duration * 1000 : 0;
      const y = 57 - Math.max(0, Math.min(1, normalized)) * 50;
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' '),
  })));

  function formatTime(seconds: number) {
    const bounded = Math.max(0, seconds);
    const minutes = Math.floor(bounded / 60);
    return `${minutes}:${(bounded % 60).toFixed(1).padStart(4, '0')}`;
  }
</script>

<section class="scenario-player" aria-label="Scenario player">
  <div class="player-heading">
    <div class="scenario-identity">
      <div class="title-row"><span class={['state-dot', { playing: running, complete: finished }]}></span><h3>{title}</h3><span class="source" title={sourceLabel}>{sourceLabel}</span></div>
      <div class="phase-row"><span class="phase-label">{inactive ? 'READY WHEN YOU ARE' : finished ? 'FINISHED' : 'CURRENT PHASE'}</span><strong aria-live="polite">{phase || (inactive ? 'Choose a scenario or import a trace' : 'Start')}</strong></div>
    </div>
    <div class="player-actions">
      <button type="button" class="play" aria-label={running ? 'Pause scenario' : 'Play scenario'} aria-pressed={running} disabled={inactive} onclick={onplay}><span aria-hidden="true">{running ? 'Ⅱ' : '▶'}</span>{running ? 'Pause' : finished ? 'Replay' : 'Play'}</button>
      <button type="button" class="restart" aria-label="Restart scenario" title="Restart scenario" disabled={inactive} onclick={onrestart}>↺</button>
      <label class="import" for={`${uid}-import`}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13V3m-4 4 4-4 4 4M4 12v5h12v-5" /></svg>Import scenario<input id={`${uid}-import`} type="file" accept=".json,application/json" onchange={onimport} /></label>
    </div>
  </div>

  <div class={['timeline', { inactive }]}>
    <svg viewBox="0 0 1000 64" preserveAspectRatio="none" role="img" aria-label={inactive ? 'No scenario selected' : `Scenario input overview. Current position ${formatTime(position)} of ${formatTime(duration)}. All channels use normalized vertical scales.`}>
      <path class="chart-grid" d="M0 7H1000M0 32H1000M0 57H1000" />
      {#if !inactive}
        <rect class="elapsed" x="0" y="0" width={progress * 1000} height="64" />
        {#each traces as trace (trace.key)}<path d={trace.path} fill="none" stroke={trace.color} stroke-width="1.5" vector-effect="non-scaling-stroke" />{/each}
        <line class="playhead" x1={progress * 1000} x2={progress * 1000} y1="0" y2="64" vector-effect="non-scaling-stroke" />
      {/if}
    </svg>
    {#if inactive}<span class="empty-message">A full maneuver, from approach to acceleration.</span>{/if}
    <input class="scrubber" type="range" min="0" max={Math.max(0.01, duration)} step="0.01" value={position} disabled={inactive} aria-label="Scenario position" aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}${phase ? `, ${phase}` : ''}`} style={`--progress:${progress * 100}%`} oninput={(event) => onseek(Number(event.currentTarget.value))} />
  </div>

  <div class="player-footer">
    <div class="trace-legend" aria-label="Trace scales">{#each channels as channel (channel.key)}<span title={channel.range}><i style={`--trace:${channel.color}`}></i>{channel.label}<small>{channel.range}</small></span>{/each}</div>
    <output class="time-readout" aria-live="off"><strong>{formatTime(position)}</strong><span>/ {formatTime(duration)}</span></output>
  </div>
</section>

<style>
  .scenario-player { border:1px solid var(--line); border-radius:9px; background:var(--panel); padding:15px 20px 12px; margin-bottom:15px; }
  .player-heading { display:flex; justify-content:space-between; align-items:center; gap:18px; margin-bottom:10px; }
  .scenario-identity { min-width:0; }
  .title-row { display:flex; align-items:center; gap:9px; min-width:0; }
  .title-row h3 { font-size:12px; font-weight:500; margin:0; white-space:nowrap; }
  .state-dot { width:5px; height:5px; border-radius:50%; background:#71828b; flex:none; }
  .state-dot.playing { background:var(--orange); box-shadow:0 0 8px #ff946b55; }
  .state-dot.complete { background:#aec494; }
  .source { font:7px var(--mono); letter-spacing:.35px; color:#839697; border:1px solid #344146; border-radius:3px; padding:3px 6px; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .phase-row { display:flex; align-items:center; gap:10px; margin-top:7px; min-width:0; }
  .phase-label { font:6px var(--mono); letter-spacing:1px; color:#6d858c; flex:none; }
  .phase-row strong { color:#c3d0d1; font-size:10px; font-weight:450; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .player-actions { display:flex; align-items:center; gap:7px; flex:none; }
  button { font-size:10px; min-height:30px; border:1px solid #3a484c; border-radius:4px; background:#20282c; padding:0 11px; color:#b8cbcf; }
  button:hover:not(:disabled) { background:#2b383d; }
  button.play { display:flex; align-items:center; justify-content:center; gap:7px; width:78px; background:#3d2c23; border-color:#95654c; color:#ffb08c; }
  button.play:hover:not(:disabled) { background:#513a2c; }
  button.play span { font-size:9px; }
  button.restart { font-size:20px; width:32px; padding:0; line-height:1; }
  button:disabled { opacity:.35; cursor:default; }
  .import { display:flex; align-items:center; justify-content:center; gap:6px; border:1px solid #39464a; border-radius:4px; min-height:30px; padding:0 10px; margin-left:5px; font-size:9px; color:#a2b5bb; cursor:pointer; }
  .import:hover { background:#243035; }
  .import svg { height:13px; width:13px; fill:none; stroke:currentColor; stroke-width:1.2; }
  .import input { position:absolute; height:1px; width:1px; opacity:0; overflow:hidden; }
  .timeline { position:relative; height:62px; border-left:1px solid #33454b; border-right:1px solid #33454b; padding:0; }
  .timeline svg { display:block; width:100%; height:58px; overflow:visible; }
  .chart-grid { stroke:#2b393f; stroke-width:1; stroke-dasharray:2 6; fill:none; vector-effect:non-scaling-stroke; }
  .elapsed { fill:#8dc9d106; }
  .playhead { stroke:#fff5cf; stroke-width:1; }
  .scrubber { appearance:none; position:absolute; bottom:-3px; left:0; width:100%; height:10px; border-radius:3px; margin:0; outline-offset:4px; background:linear-gradient(to right,#677b80 var(--progress),#2b3a40 var(--progress)) center/100% 2px no-repeat; cursor:ew-resize; }
  .scrubber::-webkit-slider-thumb { appearance:none; height:9px; width:9px; border:2px solid var(--panel); border-radius:50%; background:#eadac0; box-shadow:0 0 0 1px #a59a88; }
  .scrubber::-moz-range-thumb { height:6px; width:6px; border:2px solid var(--panel); border-radius:50%; background:#eadac0; }
  .scrubber:disabled { cursor:default; opacity:.25; }
  .inactive .chart-grid { stroke-opacity:.55; }
  .empty-message { position:absolute; inset:0; display:grid; place-items:center; color:#61767d; font:9px var(--mono); pointer-events:none; }
  .player-footer { display:flex; justify-content:space-between; align-items:center; gap:15px; margin-top:9px; }
  .trace-legend { display:flex; gap:15px; flex-wrap:wrap; }
  .trace-legend span { display:flex; align-items:center; gap:5px; color:#879da6; font-size:8px; }
  .trace-legend i { width:10px; border-top:1px solid var(--trace); }
  .trace-legend small { color:#59717b; font:6px var(--mono); margin-left:1px; }
  .time-readout { display:flex; align-items:baseline; gap:7px; font:10px var(--mono); flex:none; }
  .time-readout strong { color:#dfdfd2; font-weight:500; }
  .time-readout span { font-size:8px; color:#758d98; }
  @media(max-width:970px) { .trace-legend small { display:none; }.source { max-width:190px; } }
  @media(max-width:680px) {
    .scenario-player { padding:14px; margin-bottom:13px; }
    .player-heading { align-items:start; flex-direction:column; gap:12px; }
    .scenario-identity { width:100%; }
    .title-row h3 { font-size:11px; white-space:normal; }
    .source { margin-left:auto; max-width:145px; font-size:6px; }
    .phase-row strong { font-size:10px; }
    .phase-label { font-size:6px; }
    .player-actions { width:100%; gap:8px; }
    button.play { width:84px; }.import { margin-left:auto; }
    .timeline { height:65px; }.timeline svg { height:61px; }
    .trace-legend { gap:8px; }.trace-legend span { font-size:7px; }.trace-legend i { width:7px; }
    .player-footer { gap:8px; }.time-readout { gap:4px; font-size:9px; }.time-readout span { font-size:7px; }
    .scrubber { height:18px; bottom:-6px; }.scrubber::-webkit-slider-thumb { width:12px; height:12px; }
    .empty-message { font-size:7px; }
  }
</style>
