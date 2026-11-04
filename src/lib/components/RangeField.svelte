<script lang="ts">
  type Field = { key: string; label: string; min: number; max: number; step: number; unit: string };
  let { field, value, scope = 'setup', onchange }: {
    field: Field; value: number; scope?: string; onchange: (value: number) => void;
  } = $props();
  const id = $derived(`${scope}-${field.key}`);
  const fill = $derived((value - field.min) / (field.max - field.min) * 100);
</script>

<div class="field" data-key={field.key}>
  <div class="field-head">
    <label for={id}>{field.label}</label>
    <output for={id} aria-live="off">{value.toFixed(field.step < 1 ? 1 : 0)}<span class="unit">{field.unit}</span></output>
  </div>
  <input {id} type="range" min={field.min} max={field.max} step={field.step} {value}
    style={`--fill:${fill}%`} aria-label={field.label}
    oninput={(event) => onchange(Number(event.currentTarget.value))} />
  <div class="field-range"><span>{field.min}</span><span>{field.max}</span></div>
</div>
