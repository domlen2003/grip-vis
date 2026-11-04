<script lang="ts">
  import { onMount } from 'svelte';
  import RangeField from '#lib/components/RangeField.svelte';
  import VehicleDiagram from '#lib/components/VehicleDiagram.svelte';
  import ScenarioPlayer from '#lib/components/ScenarioPlayer.svelte';
  import { DEFAULT_SETUP, DEFAULT_INPUTS, SETUP_FIELDS, INPUT_FIELDS, SCENARIOS, sampleScenario, scenarioDuration, scenarioPhase, parseScenario, SCENARIO_MAX_BYTES, SESSION_MAX_BYTES, evaluate, createSession, parseSession } from '#lib/model.js';

  type Setup = Record<keyof typeof DEFAULT_SETUP, number>;
  type Inputs = Record<keyof typeof DEFAULT_INPUTS, number>;
  type Topic = 'grip' | 'aero' | 'suspension';
  let setup = $state<Setup>({ ...DEFAULT_SETUP });
  let inputs = $state<Inputs>({ ...DEFAULT_INPUTS });
  let baseline = $state<Setup | null>(null);
  let scenarioId = $state('manual');
  let scenarioTime = $state(0);
  let customScenario = $state<ReturnType<typeof parseScenario> | null>(null);
  let running = $state(false);
  let setupTab = $state('platform');
  let bumpElapsed = $state(Infinity);
  let topic = $state<Topic | null>(null);
  let ExplainerView = $state<typeof import('#lib/components/Explainer.svelte').default | null>(null);
  let message = $state('');
  let messageError = $state(false);
  let bumpStarted = -Infinity;
  let toastTimer: ReturnType<typeof setTimeout>;
  const storageKey = 'setup-lab.session.v2';
  const platformKeys = ['frontRideHeight', 'rearRideHeight', 'wing'];
  const result = $derived(evaluate(setup, inputs, { elapsed: bumpElapsed, height: 18 }));
  const comparison = $derived(baseline ? evaluate(baseline, inputs, { elapsed: bumpElapsed, height: 18 }) : null);
  const scenario = $derived(SCENARIOS.find((candidate) => candidate.id === scenarioId) ?? SCENARIOS[0]);
  const activeClip = $derived(scenarioId === 'imported' && customScenario ? customScenario : scenario);
  const clipDuration = $derived(scenarioDuration(activeClip));
  const clipTitle = $derived(scenarioId === 'imported' && customScenario ? customScenario.title : scenario.label);
  const clipSource = $derived(scenarioId === 'imported' && customScenario ? `${customScenario.source.kind === 'recorded' ? 'Recorded' : 'Imported synthetic'} controls · illustrative response` : 'Designed manoeuvre · illustrative response');
  const setupFields = $derived(SETUP_FIELDS.filter((field) => field.key !== 'brakeBias' && (setupTab === 'platform' ? platformKeys.includes(field.key) : !platformKeys.includes(field.key))));
  const biasField = SETUP_FIELDS.find((field) => field.key === 'brakeBias')!;
  const changedCount = $derived(baseline ? SETUP_FIELDS.filter((field) => baseline![field.key as keyof Setup] !== setup[field.key as keyof Setup]).length : 0);
  const balance = $derived(Math.max(result.metrics.frontUsage, result.metrics.rearUsage) < 0.03 ? 'Low demand' : Math.abs(result.metrics.frontUsage - result.metrics.rearUsage) < 0.06 ? 'Evenly worked' : result.metrics.frontUsage > result.metrics.rearUsage ? 'Front works harder' : 'Rear works harder');
  const insights = $derived.by(() => {
    const list = [...result.hints];
    if (list.length < 3) list.push({ tone: 'neutral', title: 'Aero grows with speed', detail: 'Wing and rake affect the assumed aero map. The small box is a qualitative platform cue, not a measured centre of pressure.' });
    if (list.length < 3) list.push({ tone: 'good', title: 'Explore one change', detail: 'Pin a setup, then check the same change under braking, turn-in and power. The model is a place to form a hypothesis.' });
    return list.slice(0, 3);
  });

  function session() { return createSession(setup, inputs, scenarioId, baseline, scenarioTime, customScenario); }
  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(session())); } catch { /* Export remains available. */ } }
  function notify(text: string, error = false) {
    clearTimeout(toastTimer); message = text; messageError = error;
    toastTimer = setTimeout(() => { message = ''; }, error ? 6500 : 3200);
  }
  function updateSetup(key: string, value: number) { setup = { ...setup, [key]: value }; persist(); }
  function updateInput(key: string, value: number) {
    inputs = { ...inputs, [key]: value }; running = false; scenarioId = 'manual'; scenarioTime = 0; persist();
  }
  function selectScenario(id: string) {
    if (id === 'imported' && !customScenario) return;
    scenarioId = id; scenarioTime = 0; running = false;
    if (id !== 'manual') inputs = sampleScenario(id === 'imported' ? customScenario! : id, 0);
    persist();
  }
  function togglePlayback() {
    if (!running && scenarioId === 'manual') selectScenario('trail-braking');
    if (!running && scenarioTime >= clipDuration) { scenarioTime = 0; inputs = sampleScenario(activeClip, 0); }
    running = !running;
    if (!running && scenarioId !== 'manual') inputs = sampleScenario(activeClip, scenarioTime);
    persist();
  }
  function seekScenario(time: number) {
    running = false; scenarioTime = Math.max(0, Math.min(clipDuration, time));
    if (scenarioId !== 'manual') inputs = sampleScenario(activeClip, scenarioTime);
    persist();
  }
  async function importScenario(event: Event) {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > SCENARIO_MAX_BYTES) throw new Error('Choose a scenario JSON smaller than 8 MiB.');
      const loaded = parseScenario(await file.text());
      customScenario = loaded; selectScenario('imported'); notify(`Loaded ${loaded.title}. Playback is paused.`);
    } catch (error) { notify(`Scenario rejected: ${error instanceof Error ? error.message : String(error)}`, true); }
    finally { input.value = ''; }
  }
  function hitBump() { bumpStarted = performance.now(); bumpElapsed = 0; }
  async function openExplainer(next: Topic) {
    running = false;
    if (scenarioId !== 'manual') inputs = sampleScenario(activeClip, scenarioTime);
    persist(); topic = next;
    if (!ExplainerView) {
      try { ExplainerView = (await import('#lib/components/Explainer.svelte')).default; }
      catch { topic = null; notify('The 3D explainer could not load. Please try again.', true); }
    }
  }
  function reset() {
    setup = { ...DEFAULT_SETUP }; inputs = { ...DEFAULT_INPUTS }; baseline = null;
    scenarioId = 'manual'; scenarioTime = 0; running = false; bumpElapsed = Infinity; bumpStarted = -Infinity;
    persist(); notify('Sandbox reset to the generic GT baseline.');
  }
  function exportSession() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(session(), null, 2) + '\n'], { type: 'application/json' }));
    const anchor = Object.assign(document.createElement('a'), { href: url, download: 'setup-lab-session.json' });
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify('Session exported with its illustrative model identity.');
  }
  async function importSession(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > SESSION_MAX_BYTES) throw new Error('Choose a Setup Lab JSON session smaller than 16 MiB.');
      const loaded = parseSession(await file.text());
      setup = loaded.setup as Setup; inputs = loaded.inputs as Inputs; baseline = loaded.baseline as Setup | null;
      customScenario = loaded.customScenario; scenarioId = loaded.scenarioId; scenarioTime = loaded.scenarioTime; running = false; bumpElapsed = Infinity; bumpStarted = -Infinity;
      persist(); notify('Session imported. Playback is paused.');
    } catch (error) { notify(`Import rejected: ${error instanceof Error ? error.message : String(error)}`, true); }
    finally { input.value = ''; }
  }
  function handleKeys(event: KeyboardEvent) {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || topic
      || (event.target instanceof Element && event.target.matches('input,textarea,select,[contenteditable]'))) return;
    if (event.key.toLowerCase() === 'p') { event.preventDefault(); togglePlayback(); }
    if (event.key.toLowerCase() === 'b') { event.preventDefault(); hitBump(); }
  }
  function handleTabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); setupTab = setupTab === 'platform' ? 'mechanical' : 'platform';
    document.getElementById(`tab-${setupTab}`)?.focus();
  }
  function signed(value: number, digits = 1) { return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`; }

  onMount(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const loaded = parseSession(saved);
        setup = loaded.setup as Setup; inputs = loaded.inputs as Inputs; baseline = loaded.baseline as Setup | null;
        customScenario = loaded.customScenario; scenarioId = loaded.scenarioId; scenarioTime = loaded.scenarioTime;
      }
    } catch { /* Invalid previous state does not prevent startup. */ }
    let frame = 0; let previous = performance.now(); let lastDraw = 0;
    function animate(now: number) {
      const delta = Math.min(0.1, Math.max(0, (now - previous) / 1000)); previous = now;
      if (running) {
        scenarioTime = Math.min(clipDuration, scenarioTime + delta);
        if (scenarioTime >= clipDuration) { inputs = sampleScenario(activeClip, clipDuration); running = false; persist(); }
      }
      if (now - lastDraw > 33) {
        if (running) inputs = sampleScenario(activeClip, scenarioTime);
        if (now - bumpStarted < 3100) bumpElapsed = (now - bumpStarted) / 1000;
        else if (Number.isFinite(bumpElapsed)) bumpElapsed = Infinity;
        lastDraw = now;
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); clearTimeout(toastTimer); };
  });
</script>

<svelte:head>
  <title>Setup Lab — Local Dynamics Sandbox</title>
  <meta name="description" content="A local vehicle setup sandbox with explicit tyre force axes, an illustrative aero platform, and interactive Three.js explainers." />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%23111314'/%3E%3Cpath d='M8 28 17 10h6l-9 18zm11 0 9-18h6l-9 18z' fill='%23ff8656'/%3E%3C/svg%3E" />
</svelte:head>
<svelte:window onkeydown={handleKeys} />

<header class="app-header">
  <a class="brand" href="/" aria-label="Setup Lab home"><svg viewBox="0 0 38 32" aria-hidden="true"><path d="M0 29 13 3h7L7 29zm13 0L26 3h7L20 29z" /></svg><span>SETUP<span class="brand-light">LAB</span></span></a>
  <span class="header-divider"></span><span class="header-caption">VEHICLE DYNAMICS WORKSPACE</span>
  <div class="header-actions"><span class="mode-badge"><i></i>ILLUSTRATIVE MODEL</span><button class="icon-button" aria-label="Explain grip circle" title="3D grip-circle explainer" onclick={() => openExplainer('grip')}>?</button></div>
</header>

<main class="page-shell">
  <section class="intro">
    <div><div class="eyebrow"><span class="tiny-square"></span> UNDERSTAND THE CAR. FIND YOUR BALANCE.</div><h1>Feel the balance<span>.</span></h1><p>See how your inputs and setup work together. One change at a time.</p></div>
    <div class="car-profile"><div class="profile-symbol"><svg viewBox="0 0 60 36" aria-hidden="true"><path d="m5 24 5-9 12-3 6-7h13l8 10 7 4v7H5z" /><circle cx="16" cy="26" r="5" /><circle cx="45" cy="26" r="5" /></svg></div><div><span class="small-label">EXPLORATION PROFILE</span><strong>Generic GT <span>· RWD</span></strong><small>Local sandbox · assumed parameters</small></div></div>
  </section>

  <div class="workspace-heading"><div class="workspace-title"><span class="tab-marker"></span><h2>Dynamics sandbox</h2><span class="subtle-tag">01</span></div><div class="workspace-tools"><label class="text-button import-button" for="import-file"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13V3m-4 4 4-4 4 4M4 12v5h12v-5" /></svg>Import session<input type="file" accept=".json,application/json" id="import-file" onchange={importSession} /></label><button class="text-button" onclick={exportSession}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10m-4-4 4 4 4-4M4 12v5h12v-5" /></svg>Export session</button><button class="text-button reset-button" onclick={reset}>↺ <span>Reset</span></button></div></div>

  <ScenarioPlayer title={clipTitle} duration={clipDuration} time={scenarioTime} {running}
    phase={scenarioPhase(activeClip, scenarioTime)} sourceLabel={scenarioId === 'manual' ? 'Choose a scenario below or import a control trace' : clipSource}
    samples={activeClip.samples} onseek={seekScenario} onplay={togglePlayback} onrestart={() => seekScenario(0)} onimport={importScenario} />

  <section class="workspace-grid" aria-label="Interactive vehicle setup lab">
    <aside class="panel inputs-panel">
      <div class="panel-heading"><div><span class="section-index">01 / INPUT</span><h3>Behind the wheel</h3></div><span class="panel-icon">↗</span></div>
      <div class="speed-display"><span id="speed-number">{Math.round(inputs.speed)}</span><span>km/h</span><svg viewBox="0 0 78 30" aria-hidden="true"><path d="M2 26h12l8-9 9 3 9-13 10 5L65 3h11" /></svg></div>
      <div class="input-fields">{#each INPUT_FIELDS as field (field.key)}<RangeField {field} value={inputs[field.key as keyof Inputs]} scope="inputs" onchange={(value) => updateInput(field.key, value)} />{/each}</div>
      <div class="section-rule"></div><div class="label-row"><span class="small-label">DRIVING SCENARIO</span><span class="micro-muted">SIMULATED</span></div>
      <div class="scenario-grid" role="group" aria-label="Driving scenarios">{#each SCENARIOS as candidate (candidate.id)}<button class={["scenario-button", { active: scenarioId === candidate.id }]} aria-pressed={scenarioId === candidate.id} onclick={() => selectScenario(candidate.id)}>{candidate.label}</button>{/each}{#if customScenario}<button class={["scenario-button", { active: scenarioId === 'imported' }]} aria-pressed={scenarioId === 'imported'} onclick={() => selectScenario('imported')}>Imported trace</button>{/if}</div>
      <p class="scenario-description">{scenarioId === 'imported' && customScenario ? `${customScenario.title} · ${customScenario.samples.length.toLocaleString()} samples` : scenario.description}</p>
      <button class={["secondary-button bump-button", { firing: bumpElapsed < 3 }]} onclick={hitBump}><svg viewBox="0 0 24 18" aria-hidden="true"><path d="M1 14h5c1-12 11-12 12 0h5" /></svg>Hit a bump <span class="key-hint">B</span></button>
      <div class="response-strip"><div><span class="small-label">LONG. DEMAND</span><strong>{signed(result.metrics.axG, 2)}<small> g</small></strong></div><div><span class="small-label">LAT. DEMAND</span><strong>{signed(result.metrics.ayG, 2)}<small> g</small></strong></div></div>
    </aside>

    <section class="panel visualization-panel" aria-labelledby="diagram-heading">
      <div class="stage-top"><div><span class="stage-dot"></span><span id="diagram-heading">Road → tyre · vehicle axes</span></div><div class="stage-state">{running ? 'SCENARIO PLAYBACK' : scenarioId === 'manual' ? 'MANUAL INPUT' : 'SCENARIO PAUSED'}</div></div>
      <VehicleDiagram {result} baseline={comparison} steering={inputs.steering} bumpActive={bumpElapsed < 3} />
      <div class="diagram-legend"><span><i class="legend-dot orange"></i>Requested force</span><span><i class="natural-key"></i>Natural grip · no downforce</span><span><i class="aero-key"></i>Aero effect</span>{#if baseline}<span><i class="legend-line dashed"></i>Pinned setup</span>{/if}</div>
      <div class="explainer-links"><button onclick={() => openExplainer('grip')}>ⓘ Grip circle in 3D</button><button onclick={() => openExplainer('aero')}>ⓘ Aero box</button><button onclick={() => openExplainer('suspension')}>ⓘ Springs & ARBs</button></div>
      <div class="stage-metrics"><div><span class="small-label">FRONT AERO</span><strong>{result.metrics.frontAeroPct.toFixed(1)}%</strong><small>{comparison ? `${signed(result.metrics.frontAeroPct - comparison.metrics.frontAeroPct)} pp vs baseline` : ''}</small></div><div><span class="small-label">DYNAMIC RAKE</span><strong>{result.metrics.rakeMm.toFixed(1)} mm</strong><small>{comparison ? `${signed(result.metrics.rakeMm - comparison.metrics.rakeMm)} mm vs baseline` : ''}</small></div><div><span class="small-label">DEMAND BALANCE</span><strong class="balance-output">{balance}</strong><small>{result.metrics.platformLimited ? 'Compression travel reached' : 'Against assumed capacity'}</small></div></div>
      <p class="model-footnote"><span>ⓘ</span> Drive ↑ · Brake ↓ · Left ← · Right →. Circle area = capacity. Natural grip uses the same inputs without vertical downforce; the band shows the aero difference.</p>
    </section>

    <aside class="panel setup-panel">
      <div class="panel-heading"><div><span class="section-index">02 / SETUP</span><h3>Shape the response</h3></div><button class="icon-button" aria-label="Explain suspension" onclick={() => openExplainer('suspension')}>?</button></div>
      <div class="setup-tabs" role="tablist" aria-label="Setup controls"><button id="tab-platform" class={{ active: setupTab === 'platform' }} role="tab" aria-selected={setupTab === 'platform'} aria-controls="setup-fields" tabindex={setupTab === 'platform' ? 0 : -1} onclick={() => setupTab = 'platform'} onkeydown={handleTabKey}>Aero & platform</button><button id="tab-mechanical" class={{ active: setupTab === 'mechanical' }} role="tab" aria-selected={setupTab === 'mechanical'} aria-controls="setup-fields" tabindex={setupTab === 'mechanical' ? 0 : -1} onclick={() => setupTab = 'mechanical'} onkeydown={handleTabKey}>Suspension</button></div>
      <div id="setup-fields" class="setup-fields" role="tabpanel" aria-labelledby={`tab-${setupTab}`} tabindex="0">{#each setupFields as field (field.key)}<RangeField {field} value={setup[field.key as keyof Setup]} onchange={(value) => updateSetup(field.key, value)} />{/each}</div>
      <div class="brake-bias-section"><div class="small-label">BRAKING BALANCE</div><RangeField field={biasField} value={setup.brakeBias} onchange={(value) => updateSetup('brakeBias', value)} /><div class="bias-caption"><span>Rearward</span><span>Forward</span></div></div>
      <div class="baseline-section"><div class="baseline-heading"><span class="small-label">SETUP COMPARISON</span><span class={["micro-muted", { saved: baseline !== null }]}>{baseline ? 'PINNED' : 'NO BASELINE'}</span></div><button class="secondary-button" onclick={() => { baseline = { ...setup }; persist(); notify('Baseline pinned. Adjust the setup to compare.'); }}>{baseline ? 'Update baseline' : 'Pin current setup'}</button><p>{!baseline ? 'Save a reference, then explore a change.' : changedCount ? `${changedCount} setup ${changedCount === 1 ? 'change' : 'changes'}. Baseline uses the same current inputs.` : 'Baseline matches the current setup. Change a parameter to compare.'}</p>{#if baseline}<button class="clear-baseline" onclick={() => { baseline = null; persist(); }}>Clear baseline</button>{/if}</div>
    </aside>
  </section>

  <section class="insights-section" aria-labelledby="insights-heading"><div class="insights-heading"><h2 id="insights-heading">What the model is telling you</h2><span>OBSERVATIONS, NOT SETUP PRESCRIPTIONS</span></div><div class="insight-grid">{#each insights as hint, index (hint.title)}<article class={`insight ${hint.tone}`}><span class="insight-icon" aria-hidden="true">{hint.tone === 'warning' ? '!' : ['↗', '⇄', '◇'][index]}</span><div><h3>{hint.title}</h3><p>{hint.detail}</p></div></article>{/each}</div></section>
  <footer class="app-footer"><span><span class="footer-dot"></span>A space to explore. A model to calibrate.</span><span>GENERIC GT / MODEL 01 <span class="footer-slash">/</span> NO SIMULATOR CONNECTED</span></footer>
</main>

{#if message}<div id="toast" class={["toast", { error: messageError }]} role="status" aria-live="polite">{message}</div>{/if}
{#if topic && ExplainerView}<ExplainerView {topic} {inputs} {setup} metrics={result.metrics} onclose={() => topic = null} />{/if}

<style>
  .explainer-links { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; padding:0 15px 17px; }
  .explainer-links button { border:1px solid #35474e; border-radius:4px; padding:7px 10px; color:#a8c6d0; background:#1b262c; font-size:9px; }
  .explainer-links button:hover { background:#263b44; color:#d7edf3; }
  .natural-key { width:13px; border-top:1px dashed #c8c5ac; }
  .aero-key { width:12px; height:5px; background:#69d9df55; border:1px solid #86c8d3; }
</style>
