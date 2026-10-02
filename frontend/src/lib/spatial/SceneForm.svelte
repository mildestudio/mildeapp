<script lang="ts">
  import type { ProjectScene, SceneInput } from './types';
  import './spatial.css';

  let { scene, busy = false, onSave }: {
    scene?: ProjectScene;
    busy?: boolean;
    onSave: (input: SceneInput) => Promise<boolean>;
  } = $props();
  let name = $state('');
  let description = $state('');
  let panoramaUrl = $state('');
  let thumbnailUrl = $state('');
  let sortOrder = $state<number>(0);
  let initialYaw = $state<number | undefined>(undefined);
  let initialPitch = $state<number | undefined>(undefined);
  let initialFov = $state<number | undefined>(undefined);

  function fill() {
    name = scene?.name ?? '';
    description = scene?.description ?? '';
    panoramaUrl = scene?.panoramaUrl ?? '';
    thumbnailUrl = scene?.thumbnailUrl ?? '';
    sortOrder = scene?.sortOrder ?? 0;
    initialYaw = scene?.initialYaw ?? undefined;
    initialPitch = scene?.initialPitch ?? undefined;
    initialFov = scene?.initialFov ?? undefined;
  }
  $effect(() => { fill(); });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const saved = await onSave({
      name: name.trim(), description: description.trim() || null,
      panoramaUrl: panoramaUrl.trim() || null, thumbnailUrl: thumbnailUrl.trim() || null,
      sortOrder, initialYaw: initialYaw ?? null, initialPitch: initialPitch ?? null, initialFov: initialFov ?? null
    });
    if (saved && !scene) fill();
  }
</script>

<form onsubmit={submit}>
  <fieldset disabled={busy}>
    <div class="form-grid">
      <label class="wide">Scene name *<input bind:value={name} required maxlength="140" /></label>
      <label class="wide">Description<textarea bind:value={description} maxlength="4000"></textarea></label>
      <label class="wide">Panorama URL<input type="url" bind:value={panoramaUrl} maxlength="2048" /></label>
      <p class="wide muted">Use an equirectangular 360° image, normally twice as wide as it is tall. External image hosts must allow cross-origin access.</p>
      <label class="wide">Thumbnail URL<input type="url" bind:value={thumbnailUrl} maxlength="2048" /></label>
      <label>Sort order<input type="number" bind:value={sortOrder} required min="0" max="2147483647" step="1" /></label>
      <label>Initial yaw (optional)<input type="number" bind:value={initialYaw} min="-360" max="360" step="any" /></label>
      <label>Initial pitch (optional)<input type="number" bind:value={initialPitch} min="-90" max="90" step="any" /></label>
      <label>Initial horizontal field of view (degrees, optional)<input type="number" bind:value={initialFov} min="1" max="179" step="any" /></label>
    </div>
    <div class="actions"><button class="primary" type="submit">{busy ? 'Saving…' : scene ? 'Save scene' : 'Create scene'}</button></div>
  </fieldset>
</form>
