import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HotspotType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import type { CreateSpaceDto, UpdateSpaceDto, CreateSceneDto, UpdateSceneDto, CreateHotspotDto, UpdateHotspotDto } from './dto/spatial.dto';

const sceneSelect = {
  id: true, projectId: true, projectSpaceId: true, name: true, description: true,
  panoramaUrl: true, thumbnailUrl: true, sortOrder: true,
  initialYaw: true, initialPitch: true, initialFov: true, createdAt: true, updatedAt: true,
} satisfies Prisma.ProjectSceneSelect;
const hotspotSelect = {
  id: true, sceneId: true, type: true, yaw: true, pitch: true,
  title: true, description: true, targetSceneId: true, createdAt: true, updatedAt: true,
} satisfies Prisma.SceneHotspotSelect;
const spaceSelect = {
  id: true, projectId: true, name: true, sortOrder: true, createdAt: true, updatedAt: true,
} satisfies Prisma.ProjectSpaceSelect;
const sceneOrder = [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] satisfies Prisma.ProjectSceneOrderByWithRelationInput[];

@Injectable()
export class SpatialService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ProjectsService) {}

  async listSpaces(userId: string, projectId: string) {
    await this.projects.requireProjectAccess(userId, projectId);
    return this.prisma.projectSpace.findMany({
      where: { projectId },
      select: { ...spaceSelect, scenes: { select: sceneSelect, orderBy: sceneOrder } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async createSpace(userId: string, projectId: string, input: CreateSpaceDto) {
    await this.projects.requireProjectOwner(userId, projectId);
    return this.prisma.projectSpace.create({
      data: { projectId, name: input.name.trim(), sortOrder: input.sortOrder },
      select: spaceSelect,
    });
  }

  async updateSpace(userId: string, spaceId: string, input: UpdateSpaceDto) {
    await this.authorizeSpace(userId, spaceId, true);
    return this.prisma.projectSpace.update({
      where: { id: spaceId },
      data: { name: input.name?.trim(), sortOrder: input.sortOrder },
      select: spaceSelect,
    });
  }

  async deleteSpace(userId: string, spaceId: string) {
    await this.authorizeSpace(userId, spaceId, true);
    await this.prisma.projectSpace.delete({ where: { id: spaceId } });
    return { deleted: true };
  }

  async listScenes(userId: string, spaceId: string) {
    await this.authorizeSpace(userId, spaceId);
    return this.prisma.projectScene.findMany({
      where: { projectSpaceId: spaceId }, select: sceneSelect, orderBy: sceneOrder,
    });
  }

  async createScene(userId: string, spaceId: string, input: CreateSceneDto) {
    const space = await this.authorizeSpace(userId, spaceId, true);
    return this.prisma.projectScene.create({
      data: { projectSpaceId: space.id, projectId: space.projectId, name: input.name.trim(), ...this.sceneData(input) },
      select: sceneSelect,
    });
  }

  async getScene(userId: string, sceneId: string) {
    const scene = await this.authorizeScene(userId, sceneId);
    const hotspots = await this.prisma.sceneHotspot.findMany({
      where: { sceneId: scene.id }, select: hotspotSelect, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return { ...scene, hotspots };
  }

  async updateScene(userId: string, sceneId: string, input: UpdateSceneDto) {
    await this.authorizeScene(userId, sceneId, true);
    return this.prisma.projectScene.update({
      where: { id: sceneId }, data: { name: input.name?.trim(), ...this.sceneData(input) }, select: sceneSelect,
    });
  }

  async deleteScene(userId: string, sceneId: string) {
    await this.authorizeScene(userId, sceneId, true);
    await this.prisma.projectScene.delete({ where: { id: sceneId } });
    return { deleted: true };
  }

  async createHotspot(userId: string, sceneId: string, input: CreateHotspotDto) {
    const scene = await this.authorizeScene(userId, sceneId, true);
    await this.validateTarget(scene.projectId, input.type, input.targetSceneId);
    return this.prisma.sceneHotspot.create({
      data: {
        sceneId, projectId: scene.projectId, type: input.type, yaw: input.yaw, pitch: input.pitch,
        title: input.title?.trim() || null, description: input.description?.trim() || null,
        targetSceneId: input.targetSceneId ?? null,
      },
      select: hotspotSelect,
    });
  }

  async updateHotspot(userId: string, hotspotId: string, input: UpdateHotspotDto) {
    const hotspot = await this.authorizeHotspot(userId, hotspotId);
    const type = input.type ?? hotspot.type;
    const targetSceneId = input.targetSceneId === undefined ? hotspot.targetSceneId : input.targetSceneId;
    await this.validateTarget(hotspot.projectId, type, targetSceneId);
    return this.prisma.sceneHotspot.update({
      where: { id: hotspotId },
      data: {
        type, targetSceneId, yaw: input.yaw, pitch: input.pitch,
        ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      },
      select: hotspotSelect,
    });
  }

  async deleteHotspot(userId: string, hotspotId: string) {
    await this.authorizeHotspot(userId, hotspotId);
    await this.prisma.sceneHotspot.delete({ where: { id: hotspotId } });
    return { deleted: true };
  }

  private sceneData(input: CreateSceneDto | UpdateSceneDto) {
    return {
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.panoramaUrl !== undefined ? { panoramaUrl: input.panoramaUrl?.trim() || null } : {}),
      ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl?.trim() || null } : {}),
      sortOrder: input.sortOrder, initialYaw: input.initialYaw, initialPitch: input.initialPitch, initialFov: input.initialFov,
    };
  }

  private async authorizeSpace(userId: string, spaceId: string, owner = false) {
    const space = await this.prisma.projectSpace.findUnique({ where: { id: spaceId }, select: spaceSelect });
    if (!space) throw new NotFoundException('Space not found');
    await this.authorizeProject(userId, space.projectId, owner);
    return space;
  }

  private async authorizeScene(userId: string, sceneId: string, owner = false) {
    const scene = await this.prisma.projectScene.findUnique({ where: { id: sceneId }, select: sceneSelect });
    if (!scene) throw new NotFoundException('Scene not found');
    await this.authorizeProject(userId, scene.projectId, owner);
    return scene;
  }

  private async authorizeHotspot(userId: string, hotspotId: string) {
    const hotspot = await this.prisma.sceneHotspot.findUnique({ where: { id: hotspotId }, select: { ...hotspotSelect, projectId: true } });
    if (!hotspot) throw new NotFoundException('Hotspot not found');
    await this.projects.requireProjectOwner(userId, hotspot.projectId);
    return hotspot;
  }

  private async authorizeProject(userId: string, projectId: string, owner: boolean) {
    if (owner) await this.projects.requireProjectOwner(userId, projectId);
    else await this.projects.requireProjectAccess(userId, projectId);
  }

  private async validateTarget(projectId: string, type: HotspotType, targetSceneId?: string | null) {
    if (type === HotspotType.NAVIGATION && !targetSceneId) {
      throw new BadRequestException('Navigation hotspots require a target scene');
    }
    if (!targetSceneId) return;
    const target = await this.prisma.projectScene.findUnique({ where: { id: targetSceneId }, select: { projectId: true } });
    if (!target || target.projectId !== projectId) {
      throw new BadRequestException('Target scene must exist in the same project');
    }
  }
}

