import type { CameraView, PanoramaMarker, PanoramaPoint, PanoramaRenderer } from './types';

interface PannellumViewer {
  getYaw(): number;
  getPitch(): number;
  getHfov(): number;
  lookAt(pitch: number, yaw: number, hfov: number, animated: boolean): void;
  mouseEventToCoords(event: MouseEvent): [number, number];
  addHotSpot(config: Record<string, unknown>): void;
  removeHotSpot(id: string): boolean;
  on(event: string, callback: () => void): void;
  off(): void;
  resize(): void;
  destroy(): void;
}

declare global {
  interface Window {
    pannellum: { viewer(container: HTMLElement, config: Record<string, unknown>): PannellumViewer };
  }
}

export async function createPanoramaRenderer(
  container: HTMLElement,
  options: {
    imageUrl: string;
    initialView: CameraView;
    signal: AbortSignal;
    onLoaded: () => void;
    onError: () => void;
    onActivate: (id: string) => void;
    onPick: (point: PanoramaPoint) => void;
  },
): Promise<PanoramaRenderer | null> {
  // Pannellum reads window at module evaluation; load it only in the browser.
  await import('pannellum');
  if (options.signal.aborted) return null;

  const viewer = window.pannellum.viewer(container, {
    type: 'equirectangular', panorama: options.imageUrl, autoLoad: true,
    yaw: options.initialView.yaw, pitch: options.initialView.pitch, hfov: options.initialView.fov,
    minHfov: 1, maxHfov: 179, showControls: false, showFullscreenCtrl: false,
    escapeHTML: true, crossOrigin: 'anonymous', mouseZoom: false, keyboardZoom: true,
  });
  let destroyed = false;
  let loaded = false;
  let picking = false;
  let markerIds: string[] = [];
  let pointerStart: { x: number; y: number } | null = null;

  viewer.on('load', () => { if (!destroyed) { loaded = true; options.onLoaded(); } });
  viewer.on('error', () => { if (!destroyed) { loaded = false; options.onError(); } });

  function pointerDown(event: PointerEvent) {
    pointerStart = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  }
  function pick(event: MouseEvent) {
    if (!loaded || !picking || !pointerStart || !event.isTrusted) return;
    const target = event.target;
    if (target instanceof Element && target.closest('button, a')) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (moved > 8) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const [pitch, yaw] = viewer.mouseEventToCoords(event);
    if (Number.isFinite(pitch) && Number.isFinite(yaw)) options.onPick({ yaw, pitch });
  }
  container.addEventListener('pointerdown', pointerDown, true);
  container.addEventListener('click', pick, true);
  const observer = new ResizeObserver(() => { if (!destroyed) viewer.resize(); });
  observer.observe(container);

  return {
    getView: () => ({ yaw: viewer.getYaw(), pitch: viewer.getPitch(), fov: viewer.getHfov() }),
    lookAt: (view) => viewer.lookAt(view.pitch, view.yaw, view.fov, false),
    setPicking: (enabled) => { picking = enabled; pointerStart = null; },
    setMarkers(markers, draft) {
      for (const id of markerIds) viewer.removeHotSpot(id);
      markerIds = [];
      for (const marker of markers) {
        viewer.addHotSpot({
          id: marker.id, yaw: marker.yaw, pitch: marker.pitch, cssClass: 'milde-panorama-marker',
          createTooltipFunc: (element: HTMLElement) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `panorama-marker-button ${marker.type === 'NAVIGATION' ? 'navigation-marker' : 'info-marker'}`;
            button.textContent = marker.type === 'NAVIGATION' ? '→' : 'i';
            button.title = marker.label;
            button.setAttribute('aria-label', `${marker.type === 'NAVIGATION' ? 'Open scene' : 'Show information'}: ${marker.label}`);
            button.addEventListener('mousedown', (event) => event.stopPropagation());
            button.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });
            button.addEventListener('click', (event) => {
              event.stopPropagation();
              if (!picking && !destroyed) options.onActivate(marker.id);
            });
            element.append(button);
          },
        });
        markerIds.push(marker.id);
      }
      if (draft) {
        const id = 'milde-unsaved-hotspot';
        viewer.addHotSpot({
          id, yaw: draft.yaw, pitch: draft.pitch, cssClass: 'milde-panorama-draft',
          createTooltipFunc: (element: HTMLElement) => {
            element.textContent = '+';
            element.setAttribute('aria-label', 'Unsaved hotspot position');
          },
        });
        markerIds.push(id);
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      container.removeEventListener('pointerdown', pointerDown, true);
      container.removeEventListener('click', pick, true);
      viewer.off();
      viewer.destroy();
    },
  };
}
