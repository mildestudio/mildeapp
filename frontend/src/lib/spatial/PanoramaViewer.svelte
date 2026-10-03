<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createPanoramaRenderer } from './viewer/pannellum-renderer';
  import type { CameraView, PanoramaPoint, PanoramaRenderer, ViewerControls } from './viewer/types';
  import type { SceneDetail } from './types';
  import 'pannellum/build/pannellum.css';
  import './viewer/panorama.css';

  let { scene, contextLabel, editable = false, busy = false, placing = false,
    draftPosition = null, selectedHotspotId = null, onNavigate, onPlace, onStartPlacement,
    onSaveView, onReady }: {
    scene: SceneDetail;
    contextLabel: string;
    editable?: boolean;
    busy?: boolean;
    placing?: boolean;
    draftPosition?: PanoramaPoint | null;
    selectedHotspotId?: string | null;
    onNavigate: (sceneId: string) => void;
    onPlace: (point: PanoramaPoint) => void;
    onStartPlacement: () => void;
    onSaveView: (view: CameraView) => Promise<boolean>;
    onReady: (controls: ViewerControls | null) => void;
  } = $props();

  let container = $state<HTMLDivElement>();
  let frame = $state<HTMLElement>();
  let renderer = $state.raw<PanoramaRenderer | null>(null);
  let ready = $state(false);
  let failed = $state(false);
  let fullscreen = $state(false);
  let fullscreenSupported = $state(false);
  let retry = $state(0);
  let actionMessage = $state('');
  let activeInfoId = $state<string | null>(null);
  const activeInfo = $derived(scene.hotspots.find((hotspot) => hotspot.id === activeInfoId && hotspot.type === 'INFO'));
  const sceneKey = $derived(scene.id);
  const panoramaUrl = $derived(scene.panoramaUrl);

  function activate(id: string) {
    if (placing) return;
    const hotspot = scene.hotspots.find((entry) => entry.id === id);
    if (!hotspot) return;
    if (hotspot.type === 'NAVIGATION' && hotspot.targetSceneId) onNavigate(hotspot.targetSceneId);
    else activeInfoId = id;
  }

  function pick(point: PanoramaPoint) {
    if (!editable || busy || !placing) return;
    if (document.fullscreenElement === frame) void document.exitFullscreen();
    onPlace(point);
  }

  $effect(() => {
    const host = container;
    const imageUrl = panoramaUrl;
    sceneKey;
    retry;
    if (!host || !imageUrl) return;
    const initialView = untrack(() => ({ yaw: scene.initialYaw ?? 0, pitch: scene.initialPitch ?? 0, fov: scene.initialFov ?? 90 }));
    const controller = new AbortController();
    let instance: PanoramaRenderer | null = null;
    ready = false; failed = false; activeInfoId = null; actionMessage = '';
    void createPanoramaRenderer(host, {
      imageUrl, initialView, signal: controller.signal,
      onLoaded: () => { if (!controller.signal.aborted) ready = true; },
      onError: () => { if (!controller.signal.aborted) { failed = true; ready = false; } },
      onActivate: activate, onPick: pick,
    }).then((value) => {
      if (controller.signal.aborted) { value?.destroy(); return; }
      instance = value;
      renderer = value;
    }).catch(() => { if (!controller.signal.aborted) failed = true; });
    return () => {
      controller.abort();
      instance?.destroy();
      renderer = null;
      onReady(null);
    };
  });

  $effect(() => {
    if (!renderer || !ready) { onReady(null); return; }
    const instance = renderer;
    onReady({
      getView: () => instance.getView(),
      focusHotspot: (id) => {
        const hotspot = scene.hotspots.find((entry) => entry.id === id);
        if (hotspot) instance.lookAt({ yaw: hotspot.yaw, pitch: hotspot.pitch, fov: instance.getView().fov });
      },
    });
  });

  $effect(() => {
    if (!renderer || !ready) return;
    renderer.setMarkers(scene.hotspots.filter((hotspot) => !draftPosition || hotspot.id !== selectedHotspotId).map((hotspot) => ({
      id: hotspot.id, yaw: hotspot.yaw, pitch: hotspot.pitch, type: hotspot.type,
      label: hotspot.title || (hotspot.type === 'NAVIGATION' ? 'Open scene' : 'Information'),
    })), draftPosition);
  });
  $effect(() => { renderer?.setPicking(editable && !busy && placing); });

  onMount(() => {
    fullscreenSupported = document.fullscreenEnabled;
    const changed = () => { fullscreen = document.fullscreenElement === frame; };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  });

  function adjust(yaw: number, pitch: number, fov: number) {
    if (!ready || !renderer) return;
    const current = renderer.getView();
    renderer.lookAt({ yaw: current.yaw + yaw, pitch: Math.max(-90, Math.min(90, current.pitch + pitch)), fov: Math.max(1, Math.min(179, current.fov + fov)) });
  }
  async function toggleFullscreen() {
    try {
      if (fullscreen) await document.exitFullscreen();
      else await frame?.requestFullscreen();
    } catch { actionMessage = 'Fullscreen is unavailable in this browser.'; }
  }
  async function saveView() {
    if (!renderer || !ready || busy || !editable) return;
    actionMessage = await onSaveView(renderer.getView()) ? 'Starting view saved.' : 'Starting view could not be saved.';
  }
</script>

<section class="panorama-frame" bind:this={frame} aria-label={`360° view of ${scene.name}`}>
  <div class="panorama-heading"><div><strong>Virtual Space</strong><p>{contextLabel}</p></div>
    {#if fullscreenSupported}<button type="button" onclick={() => void toggleFullscreen()}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>{/if}
  </div>
  <div class="panorama-stage">
    <div bind:this={container} class:placing class="panorama-canvas" role="application" aria-label={`Interactive panorama of ${scene.name}. Drag to look around, or use the view controls.`} tabindex="0"></div>
    {#if !ready && !failed}<p class="panorama-loading" role="status">Loading 360° view…</p>{/if}
    {#if failed}
      <div class="panorama-failure" role="alert"><p>The 360° view could not be loaded. Check that the panorama URL points to an image, allows cross-origin access, and your browser supports WebGL.</p><button type="button" onclick={() => { retry += 1; }}>Retry panorama</button><a href={scene.panoramaUrl ?? '#'} target="_blank" rel="noreferrer">Open source image</a></div>
    {/if}
    {#if activeInfo && ready}
      <aside class="panorama-info" aria-label="Hotspot information">
        <div><h3>{activeInfo.title || 'Information'}</h3><button type="button" aria-label="Close hotspot information" onclick={() => { activeInfoId = null; }}>Close</button></div>
        {#if activeInfo.description}<p>{activeInfo.description}</p>{:else}<p>No additional description.</p>{/if}
      </aside>
    {/if}
  </div>
  <div class="panorama-toolbar" aria-label="View controls">
    <button type="button" disabled={!ready} aria-label="Look left" onclick={() => adjust(-15, 0, 0)}>Left</button>
    <button type="button" disabled={!ready} aria-label="Look right" onclick={() => adjust(15, 0, 0)}>Right</button>
    <button type="button" disabled={!ready} aria-label="Look up" onclick={() => adjust(0, 10, 0)}>Up</button>
    <button type="button" disabled={!ready} aria-label="Look down" onclick={() => adjust(0, -10, 0)}>Down</button>
    <button type="button" disabled={!ready} aria-label="Zoom in" onclick={() => adjust(0, 0, -10)}>+</button>
    <button type="button" disabled={!ready} aria-label="Zoom out" onclick={() => adjust(0, 0, 10)}>−</button>
    <button type="button" disabled={!ready} onclick={() => renderer?.lookAt({ yaw: scene.initialYaw ?? 0, pitch: scene.initialPitch ?? 0, fov: scene.initialFov ?? 90 })}>Starting view</button>
  </div>
  {#if editable}
    <div class="panorama-toolbar" aria-label="Owner panorama controls">
      <button type="button" disabled={!ready || busy} aria-pressed={placing} onclick={onStartPlacement}>{placing ? 'Cancel placement' : selectedHotspotId ? 'Move hotspot' : 'Place hotspot'}</button>
      {#if placing}<button type="button" disabled={!ready || busy} onclick={() => { if (renderer) pick(renderer.getView()); }}>Place at view center</button>{/if}
      <button type="button" disabled={!ready || busy} onclick={() => void saveView()}>Save current view as start</button>
    </div>
  {/if}
  <p class="panorama-help" role="status">{placing ? 'Click or tap a position in the panorama. You can also aim the view and place at its center. Save the hotspot form to keep the change.' : 'Drag or swipe to look around. Use + and − to zoom; arrow keys also move the focused panorama.'}</p>
  {#if actionMessage}<p class="panorama-help" role="status">{actionMessage}</p>{/if}
</section>
