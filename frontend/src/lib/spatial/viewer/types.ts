export interface PanoramaPoint {
  yaw: number;
  pitch: number;
}

export interface CameraView extends PanoramaPoint {
  fov: number;
}

export interface PanoramaMarker extends PanoramaPoint {
  id: string;
  label: string;
  type: 'NAVIGATION' | 'INFO';
}

export interface PanoramaRenderer {
  getView(): CameraView;
  lookAt(view: CameraView): void;
  setMarkers(markers: PanoramaMarker[], draft: PanoramaPoint | null): void;
  setPicking(enabled: boolean): void;
  destroy(): void;
}

export interface ViewerControls {
  getView(): CameraView;
  focusHotspot(id: string): void;
}
