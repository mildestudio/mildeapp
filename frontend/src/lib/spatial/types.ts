export type HotspotType = 'NAVIGATION' | 'INFO';

export interface ProjectScene {
  id: string;
  projectId: string;
  projectSpaceId: string;
  name: string;
  description: string | null;
  panoramaUrl: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  initialYaw: number | null;
  initialPitch: number | null;
  initialFov: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface SceneHotspot {
  id: string;
  sceneId: string;
  type: HotspotType;
  yaw: number;
  pitch: number;
  title: string | null;
  description: string | null;
  targetSceneId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface SceneDetail extends ProjectScene {
  hotspots: SceneHotspot[];
}
export interface SpaceRecord {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProjectSpace extends SpaceRecord {
  scenes: ProjectScene[];
}
export interface SceneInput {
  name: string;
  description: string | null;
  panoramaUrl: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  initialYaw: number | null;
  initialPitch: number | null;
  initialFov: number | null;
}
export interface HotspotInput {
  type: HotspotType;
  yaw: number;
  pitch: number;
  title: string | null;
  description: string | null;
  targetSceneId: string | null;
}
