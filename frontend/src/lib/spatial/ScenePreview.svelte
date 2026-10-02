<script lang="ts">
  import { get } from 'svelte/store';
  import { spatialApi } from './api';
  import SceneForm from './SceneForm.svelte';
  import type { HotspotInput, HotspotType, ProjectSpace, SceneDetail, SceneHotspot } from './types';
  import { getProject } from '$lib/projects/api';
  import type { ProjectSummary } from '$lib/projects/types';
  import { getUser, logout } from '$lib/auth/session';
  import { loadWorkspaces, selectWorkspace, workspaces } from '$lib/workspaces/state';
  import type { WorkspaceSummary } from '$lib/workspaces/types';
  import './spatial.css';

  let { sceneId }: { sceneId: string } = $props();
  let scene = $state<SceneDetail | null>(null);
  let project = $state<ProjectSummary | null>(null);
  let workspace = $state<WorkspaceSummary | null>(null);
  let spaces = $state<ProjectSpace[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');
  let imageFailed = $state(false);
  let editingHotspotId = $state<string | null>(null);
  let type = $state<HotspotType>('INFO');
  let yaw = $state(0);
  let pitch = $state(0);
  let title = $state('');
  let description = $state('');
  let targetSceneId = $state('');

  const editable = $derived(workspace?.role === 'OWNER');
  const allScenes = $derived(spaces.flatMap((space) => space.scenes));
  const projectHref = $derived(project ? `${editable ? '/owner/projects' : '/projects'}/${project.id}` : '/');

  function resetForm() {
    editingHotspotId = null; type = 'INFO'; yaw = 0; pitch = 0; title = ''; description = ''; targetSceneId = '';
  }

  $effect(() => {
    const id = sceneId;
    let current = true;
    loading = true; error = ''; notice = ''; imageFailed = false; scene = null; workspace = null;
    resetForm();
    void (async () => {
      if (!getUser()) { window.location.replace('/login'); return; }
      try {
        const nextScene = await spatialApi.getScene(id);
        const [nextProject, , nextSpaces] = await Promise.all([
          getProject(nextScene.projectId), loadWorkspaces(), spatialApi.listSpaces(nextScene.projectId)
        ]);
        if (!current) return;
        scene = nextScene;
        project = nextProject;
        spaces = nextSpaces;
        workspace = get(workspaces).find((entry) => entry.id === nextProject.workspaceId) ?? null;
        if (workspace) selectWorkspace(workspace.id);
      } catch (cause: unknown) {
        if (current) error = cause instanceof Error ? cause.message : 'Scene could not be loaded.';
      } finally { if (current) loading = false; }
    })();
    return () => { current = false; };
  });

  function editHotspot(hotspot: SceneHotspot) {
    editingHotspotId = hotspot.id; type = hotspot.type; yaw = hotspot.yaw; pitch = hotspot.pitch;
    title = hotspot.title ?? ''; description = hotspot.description ?? ''; targetSceneId = hotspot.targetSceneId ?? '';
    document.getElementById('hotspot-form')?.scrollIntoView({ block: 'nearest' });
    document.getElementById('hotspot-type')?.focus();
  }

  async function mutate(action: () => Promise<unknown>, message: string): Promise<boolean> {
    if (busy || !scene) return false;
    const id = scene.id;
    busy = true; error = ''; notice = '';
    try {
      await action();
      const refreshed = await spatialApi.getScene(id);
      if (sceneId === id) { imageFailed = false; scene = refreshed; notice = message; }
      return true;
    } catch (cause: unknown) {
      if (sceneId === id) error = cause instanceof Error ? cause.message : 'The change could not be saved.';
      return false;
    } finally { busy = false; }
  }

  async function saveHotspot(event: SubmitEvent) {
    event.preventDefault();
    if (!scene) return;
    const input: HotspotInput = {
      type, yaw, pitch, title: title.trim() || null, description: description.trim() || null,
      targetSceneId: type === 'NAVIGATION' ? targetSceneId : null
    };
    const id = scene.id;
    const hotspotId = editingHotspotId;
    if (await mutate(() => hotspotId ? spatialApi.updateHotspot(hotspotId, input) : spatialApi.createHotspot(id, input), 'Hotspot saved.')) resetForm();
  }

  async function removeHotspot(hotspot: SceneHotspot) {
    if (!window.confirm(`Delete hotspot "${hotspot.title ?? hotspot.type}"?`)) return;
    if (await mutate(() => spatialApi.deleteHotspot(hotspot.id), 'Hotspot deleted.')) resetForm();
  }
</script>

<svelte:head><title>{scene?.name ?? 'Scene'} · Milde Project Space</title></svelte:head>

<main class="scene-page spatial">
  <header class="scene-header">
    <a href="/" class="brand">Milde Project Space</a>
    <button type="button" onclick={() => void logout()}>Log out</button>
  </header>
  {#if loading}
    <p class="loading" role="status">Loading scene…</p>
  {:else if !scene || !project}
    <p class="error" role="alert">{error || 'Scene not found.'}</p>
  {:else}
    <div class="scene-content">
      <a class="navigation" href={projectHref}>Back to {project.name}</a>
      <p class="muted">{workspace?.name} / {spaces.find((space) => space.id === scene?.projectSpaceId)?.name}</p>
      <h1>{scene.name}</h1>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      {#if scene.description}<p class="description">{scene.description}</p>{/if}
      <section class="panel" aria-label="Panorama preview">
        {#if scene.panoramaUrl && !imageFailed}
          <img class="preview" src={scene.panoramaUrl} alt={`Panorama of ${scene.name}`} onerror={() => { imageFailed = true; }} />
          <p class="muted">Panorama image preview</p>
        {:else}
          <div class="placeholder">{imageFailed ? 'The panorama image could not be loaded.' : 'No panorama image has been added to this scene.'}</div>
        {/if}
        {#if editable}
          <details>
            <summary>Edit scene</summary>
            <SceneForm {scene} {busy} onSave={(input) => mutate(() => spatialApi.updateScene(scene!.id, input), 'Scene saved.')} />
          </details>
        {/if}
      </section>

      <section class="panel" aria-labelledby="hotspots-heading">
        <h2 id="hotspots-heading">Hotspots</h2>
        {#if scene.hotspots.length}
          <ul class="hotspot-list">
            {#each scene.hotspots as hotspot (hotspot.id)}
              <li class="hotspot-row">
                {#if hotspot.type === 'NAVIGATION' && hotspot.targetSceneId}
                  <a class="hotspot-title navigation" href={`/scenes/${hotspot.targetSceneId}`}>{hotspot.title || allScenes.find((entry) => entry.id === hotspot.targetSceneId)?.name || 'Open scene'}</a>
                {:else}
                  <span class="hotspot-title">{hotspot.title || 'Information'}</span>
                {/if}
                <p class="muted">{hotspot.type} · Yaw: {hotspot.yaw}° · Pitch: {hotspot.pitch}°</p>
                {#if hotspot.description}<p class="description">{hotspot.description}</p>{/if}
                {#if editable}
                  <div class="actions">
                    <button type="button" disabled={busy} onclick={() => editHotspot(hotspot)}>Edit hotspot</button>
                    <button class="danger" type="button" disabled={busy} onclick={() => void removeHotspot(hotspot)}>Delete hotspot</button>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}<p class="muted">No hotspots have been added to this scene.</p>{/if}
      </section>

      {#if editable}
        <section class="panel" aria-labelledby="hotspot-form-heading">
          <h2 id="hotspot-form-heading">{editingHotspotId ? 'Edit hotspot' : 'Create hotspot'}</h2>
          <form id="hotspot-form" onsubmit={saveHotspot}>
            <fieldset disabled={busy}>
              <div class="form-grid">
                <label>Type<select id="hotspot-type" bind:value={type}><option value="INFO">INFO</option><option value="NAVIGATION">NAVIGATION</option></select></label>
                <label>Title<input bind:value={title} maxlength="140" /></label>
                <label>Yaw *<input type="number" bind:value={yaw} min="-360" max="360" step="any" required /></label>
                <label>Pitch *<input type="number" bind:value={pitch} min="-90" max="90" step="any" required /></label>
                <label class="wide">Description<textarea bind:value={description} maxlength="4000"></textarea></label>
                {#if type === 'NAVIGATION'}
                  <label class="wide">Target scene *
                    <select bind:value={targetSceneId} required>
                      <option value="" disabled>Select a destination</option>
                      {#each spaces as space}
                        <optgroup label={space.name}>{#each space.scenes as destination}<option value={destination.id}>{destination.name}</option>{/each}</optgroup>
                      {/each}
                    </select>
                  </label>
                {/if}
              </div>
              <div class="actions">
                <button class="primary" type="submit">{busy ? 'Saving…' : 'Save hotspot'}</button>
                {#if editingHotspotId}<button type="button" onclick={resetForm}>Cancel edit</button>{/if}
              </div>
            </fieldset>
          </form>
        </section>
      {/if}
    </div>
  {/if}
</main>

<style>
  .scene-page { min-height: 100svh; padding: 0 clamp(18px, 6vw, 84px) 72px; background: #f6f4ee; }
  .scene-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; min-height: 78px; border-bottom: 1px solid #deddd3; }
  .brand { color: #344332; font-family: Georgia, serif; font-size: 21px; text-decoration: none; }
  .scene-content { width: min(100%, 920px); margin: 40px auto 0; }
  h1 { margin: 14px 0 24px; font: 400 clamp(36px, 6vw, 58px)/1.1 Georgia, serif; letter-spacing: -0.04em; }
  .loading { margin-top: 15vh; text-align: center; }
</style>
