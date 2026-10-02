import { apiRequest } from '$lib/api';
import type { ProjectSpace, SpaceRecord, ProjectScene, SceneDetail, SceneHotspot, SceneInput, HotspotInput } from './types';

export const spatialApi = {
  listSpaces: (projectId: string) => apiRequest<ProjectSpace[]>(`/projects/${projectId}/spaces`),
  createSpace: (projectId: string, body: { name: string; sortOrder: number }) =>
    apiRequest<SpaceRecord>(`/projects/${projectId}/spaces`, { method: 'POST', body }),
  updateSpace: (spaceId: string, body: { name: string; sortOrder: number }) =>
    apiRequest<SpaceRecord>(`/spaces/${spaceId}`, { method: 'PATCH', body }),
  deleteSpace: (spaceId: string) => apiRequest<{ deleted: boolean }>(`/spaces/${spaceId}`, { method: 'DELETE' }),
  listScenes: (spaceId: string) => apiRequest<ProjectScene[]>(`/spaces/${spaceId}/scenes`),
  createScene: (spaceId: string, body: SceneInput) =>
    apiRequest<ProjectScene>(`/spaces/${spaceId}/scenes`, { method: 'POST', body }),
  getScene: (sceneId: string) => apiRequest<SceneDetail>(`/scenes/${sceneId}`),
  updateScene: (sceneId: string, body: Partial<SceneInput>) =>
    apiRequest<ProjectScene>(`/scenes/${sceneId}`, { method: 'PATCH', body }),
  deleteScene: (sceneId: string) => apiRequest<{ deleted: boolean }>(`/scenes/${sceneId}`, { method: 'DELETE' }),
  createHotspot: (sceneId: string, body: HotspotInput) =>
    apiRequest<SceneHotspot>(`/scenes/${sceneId}/hotspots`, { method: 'POST', body }),
  updateHotspot: (hotspotId: string, body: Partial<HotspotInput>) =>
    apiRequest<SceneHotspot>(`/hotspots/${hotspotId}`, { method: 'PATCH', body }),
  deleteHotspot: (hotspotId: string) => apiRequest<{ deleted: boolean }>(`/hotspots/${hotspotId}`, { method: 'DELETE' })
};
