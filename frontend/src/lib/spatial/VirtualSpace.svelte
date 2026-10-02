<script lang="ts">
  import { spatialApi } from './api';
  import type { ProjectSpace } from './types';
  import SceneForm from './SceneForm.svelte';
  import './spatial.css';

  let { projectId, editable = false }: { projectId: string; editable?: boolean } = $props();
  let spaces = $state<ProjectSpace[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');
  let revision = $state(0);
  let spaceName = $state('');
  let spaceSortOrder = $state(0);

  $effect(() => {
    const id = projectId;
    revision;
    let current = true;
    loading = true;
    void spatialApi.listSpaces(id).then((value) => {
      if (current) spaces = value;
    }).catch((cause: unknown) => {
      if (current) error = cause instanceof Error ? cause.message : 'Virtual space could not be loaded.';
    }).finally(() => { if (current) loading = false; });
    return () => { current = false; };
  });

  async function mutate(action: () => Promise<unknown>, message: string): Promise<boolean> {
    if (busy) return false;
    busy = true;
    error = '';
    notice = '';
    try {
      await action();
      revision += 1;
      notice = message;
      return true;
    } catch (cause: unknown) {
      error = cause instanceof Error ? cause.message : 'The change could not be saved.';
      return false;
    } finally { busy = false; }
  }
  async function addSpace(event: SubmitEvent) {
    event.preventDefault();
    if (await mutate(() => spatialApi.createSpace(projectId, { name: spaceName.trim(), sortOrder: spaceSortOrder }), 'Space created.')) {
      spaceName = '';
      spaceSortOrder = 0;
    }
  }
  async function renameSpace(event: SubmitEvent, space: ProjectSpace) {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    await mutate(() => spatialApi.updateSpace(space.id, {
      name: String(data.get('name')).trim(), sortOrder: Number(data.get('sortOrder'))
    }), 'Space updated.');
  }
  async function deleteSpace(space: ProjectSpace) {
    if (!window.confirm(`Delete ${space.name}? Its scenes, hotspots and incoming scene links will be removed.`)) return;
    await mutate(() => spatialApi.deleteSpace(space.id), 'Space deleted.');
  }
  async function deleteScene(sceneId: string, sceneName: string) {
    if (!window.confirm(`Delete ${sceneName}? Its hotspots and incoming navigation links will be removed.`)) return;
    await mutate(() => spatialApi.deleteScene(sceneId), 'Scene deleted.');
  }
</script>

<section class="spatial" id="virtual-space" aria-labelledby="virtual-space-heading">
  <div class="panel">
    <h2 id="virtual-space-heading">Virtual Space</h2>
    <p class="muted">{editable ? 'Group navigable scenes into spaces such as floors, outdoor areas or design proposals.' : 'Open a scene to explore its image and navigation links.'}</p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if notice}<p class="notice" role="status">{notice}</p>{/if}
    {#if editable}
      <details>
        <summary>Create a space</summary>
        <form onsubmit={addSpace}>
          <fieldset disabled={busy}>
            <div class="form-grid">
              <label>Space name *<input bind:value={spaceName} required maxlength="140" placeholder="e.g. Floor 1" /></label>
              <label>Sort order<input type="number" bind:value={spaceSortOrder} required min="0" max="2147483647" step="1" /></label>
            </div>
            <div class="actions"><button class="primary" type="submit">{busy ? 'Saving…' : 'Create space'}</button></div>
          </fieldset>
        </form>
      </details>
    {/if}
  </div>

  {#if loading}
    <p role="status">Loading virtual space…</p>
  {:else if spaces.length === 0 && !error}
    <p class="muted">No spaces have been added to this project yet.</p>
  {:else}
    {#each spaces as space (space.id)}
      <section class="panel" aria-label={space.name}>
        <h3>{space.name}</h3>
        {#if editable}
          <details>
            <summary>Edit space</summary>
            <form onsubmit={(event) => void renameSpace(event, space)}>
              <fieldset disabled={busy}>
                <div class="form-grid">
                  <label>Space name *<input name="name" value={space.name} required maxlength="140" /></label>
                  <label>Sort order<input name="sortOrder" value={space.sortOrder} type="number" required min="0" max="2147483647" step="1" /></label>
                </div>
                <div class="actions">
                  <button type="submit">Save space</button>
                  <button class="danger" type="button" onclick={() => void deleteSpace(space)}>Delete space</button>
                </div>
              </fieldset>
            </form>
          </details>
        {/if}
        {#if space.scenes.length}
          <ul class="scene-list">
            {#each space.scenes as scene (scene.id)}
              <li class="scene-row">
                <a class="scene-link" href={`/scenes/${scene.id}`}>
                  {#if scene.thumbnailUrl}<img class="thumbnail" src={scene.thumbnailUrl} alt="" loading="lazy" />{/if}
                  <span>{scene.name}</span>
                </a>
                {#if editable}
                  <details>
                    <summary>Edit {scene.name}</summary>
                    <SceneForm {scene} {busy} onSave={(input) => mutate(() => spatialApi.updateScene(scene.id, input), 'Scene saved.')} />
                    <div class="actions"><button class="danger" type="button" disabled={busy} onclick={() => void deleteScene(scene.id, scene.name)}>Delete scene</button></div>
                  </details>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}<p class="muted">No scenes in this space yet.</p>{/if}
        {#if editable}
          <details>
            <summary>Create a scene in {space.name}</summary>
            <SceneForm {busy} onSave={(input) => mutate(() => spatialApi.createScene(space.id, input), 'Scene created.')} />
          </details>
        {/if}
      </section>
    {/each}
  {/if}
</section>
