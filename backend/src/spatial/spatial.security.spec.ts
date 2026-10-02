import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WorkspaceRole } from '@prisma/client';
import { hash } from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Spatial HTTP authorization and database integrity', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let workspaceId: string;
  let outsideWorkspaceId: string;
  const userIds: string[] = [];
  const cookies: Record<string, string> = {};
  const membershipIds: Record<string, string> = {};
  let projectId: string;
  let otherProjectId: string;
  let spaceId: string;
  let livingId: string;
  let kitchenId: string;
  let otherSceneId: string;
  let navigationId: string;
  let infoId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const prefix = randomUUID();
    workspaceId = (await prisma.workspace.create({ data: { name: 'Spatial test', slug: `spatial-test-${prefix}` } })).id;
    outsideWorkspaceId = (await prisma.workspace.create({ data: { name: 'Outside test', slug: `spatial-outside-${prefix}` } })).id;
    const passwordHash = await hash('Password1!', 4);
    const members: [string, WorkspaceRole][] = [
      ['owner', WorkspaceRole.OWNER], ['employee', WorkspaceRole.EMPLOYEE],
      ['unassignedEmployee', WorkspaceRole.EMPLOYEE], ['client', WorkspaceRole.CLIENT],
      ['otherClient', WorkspaceRole.CLIENT], ['contractor', WorkspaceRole.CONTRACTOR],
      ['outside', WorkspaceRole.EMPLOYEE],
    ];
    for (const [key, role] of members) {
      const user = await prisma.user.create({
        data: { name: key, email: `${key}.${prefix}@example.test`, passwordHash, role: 'CLIENT' },
      });
      userIds.push(user.id);
      membershipIds[key] = (await prisma.workspaceMember.create({
        data: { userId: user.id, workspaceId: key === 'outside' ? outsideWorkspaceId : workspaceId, role },
      })).id;
      cookies[key] = `milde_access_token=${await jwt.signAsync({ sub: user.id })}`;
    }
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: `owner.${prefix}@example.test`, password: 'Password1!' }).expect(201);
    expect(login.body.accessToken).toBeUndefined();
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.workspace.deleteMany({ where: { id: { in: [workspaceId, outsideWorkspaceId].filter(Boolean) } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
    if (app) await app.close();
  });

  const post = (path: string, role: string, body: object) =>
    request(app.getHttpServer()).post('/api/v1' + path).set('Cookie', cookies[role]).send(body);
  const get = (path: string, role: string) =>
    request(app.getHttpServer()).get('/api/v1' + path).set('Cookie', cookies[role]);
  const patch = (path: string, role: string, body: object) =>
    request(app.getHttpServer()).patch('/api/v1' + path).set('Cookie', cookies[role]).send(body);
  const remove = (path: string, role: string) =>
    request(app.getHttpServer()).delete('/api/v1' + path).set('Cookie', cookies[role]);

  it('allows the workspace owner to create projects despite a CLIENT account role', async () => {
    projectId = (await post(`/workspaces/${workspaceId}/projects`, 'owner', { name: 'Smith Residence' }).expect(201)).body.id;
    otherProjectId = (await post(`/workspaces/${workspaceId}/projects`, 'owner', { name: 'Other Client Residence' }).expect(201)).body.id;
  });

  it.each(['employee', 'client', 'contractor'])('denies project creation by %s', async (role) => {
    await post(`/workspaces/${workspaceId}/projects`, role, { name: 'Forbidden' }).expect(403);
  });

  it('assigns only existing workspace members and rejects duplicates and foreign membership', async () => {
    for (const role of ['employee', 'client', 'contractor']) {
      await post(`/projects/${projectId}/members`, 'owner', { workspaceMemberId: membershipIds[role] }).expect(201);
    }
    await post(`/projects/${otherProjectId}/members`, 'owner', { workspaceMemberId: membershipIds.otherClient }).expect(201);
    await post(`/projects/${projectId}/members`, 'owner', { workspaceMemberId: membershipIds.client }).expect(409);
    await post(`/projects/${projectId}/members`, 'owner', { workspaceMemberId: membershipIds.outside }).expect(404);
    await post(`/projects/${projectId}/members`, 'employee', { workspaceMemberId: membershipIds.otherClient }).expect(403);
    await post(`/projects/${projectId}/members`, 'owner', { userId: userIds[1] }).expect(400);
  });

  it('creates spaces, scenes, INFO hotspots, and a Living Room to Kitchen navigation link', async () => {
    spaceId = (await post(`/projects/${projectId}/spaces`, 'owner', { name: 'Floor 1', sortOrder: 0 }).expect(201)).body.id;
    livingId = (await post(`/spaces/${spaceId}/scenes`, 'owner', { name: 'Living Room', panoramaUrl: null }).expect(201)).body.id;
    kitchenId = (await post(`/spaces/${spaceId}/scenes`, 'owner', { name: 'Kitchen', sortOrder: 1 }).expect(201)).body.id;
    navigationId = (await post(`/scenes/${livingId}/hotspots`, 'owner', {
      type: 'NAVIGATION', yaw: 42.5, pitch: 0, title: 'Kitchen', targetSceneId: kitchenId,
    }).expect(201)).body.id;
    infoId = (await post(`/scenes/${livingId}/hotspots`, 'owner', {
      type: 'INFO', yaw: 120.5, pitch: -4.2, title: 'TV Wall', description: 'Feature wall',
    }).expect(201)).body.id;
    const otherSpace = (await post(`/projects/${otherProjectId}/spaces`, 'owner', { name: 'Other Floor' }).expect(201)).body.id;
    otherSceneId = (await post(`/spaces/${otherSpace}/scenes`, 'owner', { name: 'Other Bedroom' }).expect(201)).body.id;
  });

  it('rejects cross-project targets on create and partial update, and requires navigation destinations', async () => {
    await post(`/scenes/${livingId}/hotspots`, 'owner', { type: 'NAVIGATION', yaw: 0, pitch: 0, targetSceneId: otherSceneId }).expect(400);
    await patch(`/hotspots/${navigationId}`, 'owner', { targetSceneId: otherSceneId }).expect(400);
    await post(`/scenes/${livingId}/hotspots`, 'owner', { type: 'NAVIGATION', yaw: 0, pitch: 0 }).expect(400);
    await patch(`/hotspots/${infoId}`, 'owner', { type: 'NAVIGATION' }).expect(400);
    await patch(`/hotspots/${navigationId}`, 'owner', { targetSceneId: null }).expect(400);
  });

  it('enforces same-project targets in the database even when bypassing the API', async () => {
    await expect(prisma.sceneHotspot.create({
      data: { projectId, sceneId: livingId, type: 'NAVIGATION', yaw: 0, pitch: 0, targetSceneId: otherSceneId },
    })).rejects.toThrow();
    await expect(prisma.sceneHotspot.create({
      data: { projectId, sceneId: livingId, type: 'NAVIGATION', yaw: 0, pitch: 0 },
    })).rejects.toThrow();
  });

  it.each(['employee', 'client', 'contractor'])('allows assigned %s to read project, spaces, scenes, and hotspots', async (role) => {
    await get(`/projects/${projectId}`, role).expect(200);
    const spaces = await get(`/projects/${projectId}/spaces`, role).expect(200);
    expect(spaces.body[0].scenes.map((scene: { name: string }) => scene.name)).toEqual(['Living Room', 'Kitchen']);
    await get(`/spaces/${spaceId}/scenes`, role).expect(200);
    const living = await get(`/scenes/${livingId}`, role).expect(200);
    expect(living.body.hotspots.find((hotspot: { id: string }) => hotspot.id === navigationId).targetSceneId).toBe(kitchenId);
    await get(`/scenes/${kitchenId}`, role).expect(200);
  });

  it.each(['unassignedEmployee', 'otherClient', 'outside'])('denies %s access through every spatial entry point', async (role) => {
    for (const path of [`/projects/${projectId}`, `/projects/${projectId}/spaces`, `/spaces/${spaceId}/scenes`, `/scenes/${livingId}`]) {
      const response = await get(path, role);
      expect([403, 404]).toContain(response.status);
    }
  });

  it('filters project lists by assignment while owners see every project', async () => {
    expect((await get(`/workspaces/${workspaceId}/projects`, 'owner').expect(200)).body).toHaveLength(2);
    for (const role of ['employee', 'client', 'contractor']) {
      const projects = (await get(`/workspaces/${workspaceId}/projects`, role).expect(200)).body;
      expect(projects.map((project: { id: string }) => project.id)).toEqual([projectId]);
    }
    expect((await get(`/workspaces/${workspaceId}/projects`, 'unassignedEmployee').expect(200)).body).toEqual([]);
    expect((await get(`/workspaces/${workspaceId}/projects`, 'otherClient').expect(200)).body.map((project: { id: string }) => project.id)).toEqual([otherProjectId]);
  });

  it.each(['employee', 'client', 'contractor'])('denies %s every spatial mutation', async (role) => {
    await post(`/projects/${projectId}/spaces`, role, { name: 'Forbidden' }).expect(403);
    await patch(`/spaces/${spaceId}`, role, { name: 'Forbidden' }).expect(403);
    await remove(`/spaces/${spaceId}`, role).expect(403);
    await post(`/spaces/${spaceId}/scenes`, role, { name: 'Forbidden' }).expect(403);
    await patch(`/scenes/${livingId}`, role, { name: 'Forbidden' }).expect(403);
    await remove(`/scenes/${livingId}`, role).expect(403);
    await post(`/scenes/${livingId}/hotspots`, role, { type: 'INFO', yaw: 0, pitch: 0 }).expect(403);
    await patch(`/hotspots/${infoId}`, role, { title: 'Forbidden' }).expect(403);
    await remove(`/hotspots/${infoId}`, role).expect(403);
  });

  it('validates numeric, URL, enum and nullable metadata inputs', async () => {
    await post(`/spaces/${spaceId}/scenes`, 'owner', { name: 'Bad', panoramaUrl: 'javascript:alert(1)' }).expect(400);
    await post(`/scenes/${livingId}/hotspots`, 'owner', { type: 'INFO', yaw: 0, pitch: 91 }).expect(400);
    await post(`/scenes/${livingId}/hotspots`, 'owner', { type: 'TASK', yaw: 0, pitch: 0 }).expect(400);
    await patch(`/spaces/${spaceId}`, 'owner', { name: null }).expect(400);
    await patch(`/scenes/${livingId}`, 'owner', { name: '   ' }).expect(400);
    await patch(`/scenes/${livingId}`, 'owner', { initialFov: 0 }).expect(400);
    await patch(`/scenes/${livingId}`, 'owner', { description: 'Updated', initialYaw: 42, initialPitch: -4, initialFov: 90 }).expect(200);
    await patch(`/scenes/${livingId}`, 'owner', { description: null, initialYaw: null }).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/scenes/${livingId}`).expect(401);
  });

  it('allows owner updates while stripping attempted hierarchy reassignment', async () => {
    await patch(`/spaces/${spaceId}`, 'owner', { name: 'Ground Floor', sortOrder: 2, projectId: otherProjectId }).expect(200);
    const result = await patch(`/scenes/${livingId}`, 'owner', { name: 'Living Area', projectSpaceId: 'outside-space', projectId: otherProjectId }).expect(200);
    expect(result.body.projectId).toBe(projectId);
    expect(result.body.projectSpaceId).toBe(spaceId);
    await patch(`/hotspots/${infoId}`, 'owner', { title: 'Feature Wall', pitch: -3 }).expect(200);
  });

  it('cascades scenes and navigation links without deleting accounts or workspace memberships', async () => {
    await remove(`/scenes/${kitchenId}`, 'owner').expect(200);
    const remaining = await get(`/scenes/${livingId}`, 'owner').expect(200);
    expect(remaining.body.hotspots.map((hotspot: { id: string }) => hotspot.id)).toEqual([infoId]);
    await remove(`/hotspots/${infoId}`, 'owner').expect(200);
    await remove(`/spaces/${spaceId}`, 'owner').expect(200);
    await get(`/scenes/${livingId}`, 'owner').expect(404);
    expect(await prisma.sceneHotspot.count({ where: { projectId } })).toBe(0);
    expect(await prisma.workspaceMember.count({ where: { workspaceId } })).toBe(6);
    expect(await prisma.user.count({ where: { id: { in: userIds } } })).toBe(7);
    const space = await prisma.projectSpace.create({ data: { projectId, name: 'Cascade proof' } });
    const scene = await prisma.projectScene.create({ data: { projectId, projectSpaceId: space.id, name: 'Cascade scene' } });
    await prisma.sceneHotspot.create({ data: { projectId, sceneId: scene.id, type: 'INFO', yaw: 0, pitch: 0 } });
    await prisma.project.delete({ where: { id: projectId } });
    expect(await prisma.projectSpace.count({ where: { projectId } })).toBe(0);
    expect(await prisma.projectScene.count({ where: { projectId } })).toBe(0);
    expect(await prisma.sceneHotspot.count({ where: { projectId } })).toBe(0);
    expect(await prisma.workspace.count({ where: { id: workspaceId } })).toBe(1);
  });
});
