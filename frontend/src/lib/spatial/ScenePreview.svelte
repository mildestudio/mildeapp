<script lang="ts">
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import { spatialApi } from './api';
  import SceneForm from './SceneForm.svelte';
  import PanoramaViewer from './PanoramaViewer.svelte';
  import type { CameraView, PanoramaPoint, ViewerControls } from './viewer/types';
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
  let placing = $state(false);
  let hasDraftPosition = $state(false);
  let panoramaControls = $state.raw<ViewerControls | null>(null);
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
  const currentSpace = $derived(spaces.find((space) => space.id === scene?.projectSpaceId));
  const draftPosition = $derived(hasDraftPosition ? { yaw, pitch } : null);

  function resetForm() {
    editingHotspotId = null; type = 'INFO'; yaw = 0; pitch = 0; title = ''; description = ''; targetSceneId = '';
    placing = false; hasDraftPosition = false;
  }

  $effect(() => {
    const id = sceneId;
    let current = true;
    loading = true; error = ''; notice = ''; scene = null; workspace = null; panoramaControls = null;
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
    if (!editable || busy) return;
    editingHotspotId = hotspot.id; type = hotspot.type; yaw = hotspot.yaw; pitch = hotspot.pitch;
    title = hotspot.title ?? ''; description = hotspot.description ?? ''; targetSceneId = hotspot.targetSceneId ?? '';
    placing = false; hasDraftPosition = true;
    panoramaControls?.focusHotspot(hotspot.id);
    document.getElementById('hotspot-form')?.scrollIntoView({ block: 'nearest' });
    document.getElementById('hotspot-type')?.focus();
  }

  function handleViewerReady(controls: ViewerControls | null) { panoramaControls = controls; }
  function navigateScene(id: string) { if (id !== sceneId) void goto(`/scenes/${id}`); }
  function togglePlacement() { if (editable && !busy) placing = !placing; }
  async function placeHotspot(point: PanoramaPoint) {
    if (!editable || busy) return;
    yaw = Math.round(point.yaw * 1000) / 1000;
    pitch = Math.round(point.pitch * 1000) / 1000;
    hasDraftPosition = true; placing = false;
    await tick();
    document.getElementById('hotspot-form')?.scrollIntoView({ block: 'nearest' });
    document.getElementById('hotspot-title')?.focus();
  }
  async function saveStartingView(view: CameraView) {
    if (!editable || !scene) return false;
    const id = scene.id;
    return mutate(() => spatialApi.updateScene(id, {
      initialYaw: view.yaw, initialPitch: view.pitch, initialFov: view.fov,
    }), 'Starting view saved.');
  }

  async function mutate(action: () => Promise<unknown>, message: string): Promise<boolean> {
    if (busy || !scene) return false;
    const id = scene.id;
    busy = true; error = ''; notice = '';
    try {
      await action();
      const refreshed = await spatialApi.getScene(id);
      if (sceneId !== id) return false;
      scene = refreshed; notice = message;
      return true;
    } catch (cause: unknown) {
      if (sceneId === id) error = cause instanceof Error ? cause.message : 'The change could not be saved.';
      return false;
    } finally { busy = false; }
  }

  async function saveHotspot(event: SubmitEvent) {
    event.preventDefault();
    if (!scene || !editable || busy) return;
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
      <nav class="breadcrumbs" aria-label="Scene breadcrumb">
        <a href="/">{workspace?.name ?? 'Workspace'}</a><span aria-hidden="true">/</span>
        <a href={projectHref}>{project.name}</a><span aria-hidden="true">/</span>
        <a href={`${projectHref}#virtual-space`}>Virtual Space</a><span aria-hidden="true">/</span>
        <span>{currentSpace?.name}</span><span aria-hidden="true">/</span><span aria-current="page">{scene.name}</span>
      </nav>
      <nav class="project-sections" aria-label="Project sections">
        <a href={`${projectHref}#overview`}>Overview</a>
        <a href={`${projectHref}#virtual-space`} aria-current="location">Virtual Space</a>
      </nav>
      <h1>{scene.name}</h1>
      <p class="muted">{project.name} · {project.status.replaceAll('_', ' ')}</p>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      {#if scene.description}<p class="description">{scene.description}</p>{/if}
      <label class="scene-picker">Scene
        <select value={scene.id} onchange={(event) => navigateScene(event.currentTarget.value)}>
          {#each spaces as space}<optgroup label={space.name}>{#each space.scenes as destination}<option value={destination.id}>{destination.name}</option>{/each}</optgroup>{/each}
        </select>
      </label>
      <section class="viewer-section" aria-label="Project panorama">
        {#if scene.panoramaUrl}
          <PanoramaViewer {scene} contextLabel={`${workspace?.name ?? 'Workspace'} / ${project.name} / ${currentSpace?.name ?? 'Space'} / ${scene.name}`}
            {editable} {busy} {placing} {draftPosition} selectedHotspotId={editingHotspotId}
            onNavigate={navigateScene} onPlace={placeHotspot} onStartPlacement={togglePlacement}
            onSaveView={saveStartingView} onReady={handleViewerReady} />
        {:else}
          <div class="placeholder">No panorama image has been added to this scene. {editable ? 'Add an equirectangular image URL using Edit scene.' : 'You can still read the scene information and use its navigation links below.'}</div>
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
                <label>Title<input id="hotspot-title" bind:value={title} maxlength="140" /></label>
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
                {#if editingHotspotId || hasDraftPosition || placing}<button type="button" onclick={resetForm}>Cancel hotspot changes</button>{/if}
              </div>
              {#if hasDraftPosition}<p class="muted">The marked position is a draft until you save this form.</p>{/if}
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
  .scene-content { width: min(100%, 1160px); margin: 32px auto 0; }
  .breadcrumbs { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px; line-height: 1.7; }
  .breadcrumbs a, .project-sections a { color: #344332; text-underline-offset: 4px; }
  .project-sections { display: flex; gap: 24px; margin: 20px 0; border-bottom: 1px solid #deddd3; }
  .project-sections a { display: inline-flex; align-items: center; min-height: 44px; text-decoration: none; }
  .project-sections a[aria-current] { border-bottom: 2px solid #344332; }
  .scene-picker { width: min(100%, 380px); margin: 24px 0 16px; }
  .viewer-section { margin-top: 16px; }
  h1 { margin: 14px 0 24px; font: 400 clamp(36px, 6vw, 58px)/1.1 Georgia, serif; letter-spacing: -0.04em; }
  .loading { margin-top: 15vh; text-align: center; }
</style>
