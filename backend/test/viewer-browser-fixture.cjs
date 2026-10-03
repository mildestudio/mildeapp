require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { hash } = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const statePath = path.join(__dirname, 'viewer-browser-fixture.json');
(async () => {
  if (process.argv[2] === 'cleanup') {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    await prisma.workspace.delete({ where: { id: state.workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: state.userIds } } });
    fs.unlinkSync(statePath);
    console.log('Viewer fixtures removed.');
    return;
  }
  const key = randomUUID();
  const state = { workspaceId: '', userIds: [], emails: {}, projectId: '', livingId: '', kitchenId: '', unassignedSceneId: '' };
  const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
  state.workspaceId = (await prisma.workspace.create({ data: { name: 'Viewer Test Studio', slug: `viewer-${key}` } })).id;
  save();
  const passwordHash = await hash('ViewerTest1!', 4);
  const memberships = [];
  for (const role of ['OWNER', 'CLIENT', 'EMPLOYEE', 'CONTRACTOR']) {
    const email = `${role.toLowerCase()}.${key}@example.test`;
    const user = await prisma.user.create({ data: { email, name: `Viewer Test ${role}`, role, passwordHash } });
    state.userIds.push(user.id); state.emails[role] = email; save();
    const membership = await prisma.workspaceMember.create({ data: { userId: user.id, workspaceId: state.workspaceId, role } });
    memberships.push(membership.id);
  }
  state.projectId = (await prisma.project.create({ data: { workspaceId: state.workspaceId, name: 'Viewer Test Residence' } })).id;
  for (const workspaceMemberId of memberships.slice(1)) await prisma.projectMember.create({ data: { projectId: state.projectId, workspaceId: state.workspaceId, workspaceMemberId } });
  const space = await prisma.projectSpace.create({ data: { projectId: state.projectId, name: 'Floor 1' } });
  const sceneData = { projectId: state.projectId, projectSpaceId: space.id, panoramaUrl: 'http://localhost:5173/viewer-test-panorama.png', initialYaw: 0, initialPitch: 0, initialFov: 90 };
  state.livingId = (await prisma.projectScene.create({ data: { ...sceneData, name: 'Living Room' } })).id;
  state.kitchenId = (await prisma.projectScene.create({ data: { ...sceneData, name: 'Kitchen' } })).id;
  await prisma.sceneHotspot.create({ data: { projectId: state.projectId, sceneId: state.livingId, type: 'NAVIGATION', yaw: 20, pitch: 0, title: 'Kitchen', targetSceneId: state.kitchenId } });
  await prisma.sceneHotspot.create({ data: { projectId: state.projectId, sceneId: state.livingId, type: 'INFO', yaw: -20, pitch: 0, title: 'TV Wall', description: 'Feature wall <img src=x onerror=alert(1)>' } });
  await prisma.sceneHotspot.create({ data: { projectId: state.projectId, sceneId: state.kitchenId, type: 'NAVIGATION', yaw: 0, pitch: 0, title: 'Living Room', targetSceneId: state.livingId } });
  const other = await prisma.project.create({ data: { workspaceId: state.workspaceId, name: 'Unassigned Project' } });
  const otherSpace = await prisma.projectSpace.create({ data: { projectId: other.id, name: 'Other Floor' } });
  state.unassignedSceneId = (await prisma.projectScene.create({ data: { projectId: other.id, projectSpaceId: otherSpace.id, name: 'Private Scene' } })).id;
  save(); console.log(JSON.stringify(state));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
