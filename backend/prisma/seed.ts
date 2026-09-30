import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole, WorkspaceRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (process.env['NODE_ENV'] === 'production') {
	throw new Error('The development authentication seed cannot run in production');
}

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString }),
});

const testPassword = process.env['SEED_TEST_PASSWORD'] ?? 'MildeDemo!2026';
const accounts = [
	{ name: 'Milde Test Owner', email: 'owner@milde.test', role: UserRole.OWNER, workspaceRole: WorkspaceRole.OWNER },
	{ name: 'Milde Test Employee', email: 'employee@milde.test', role: UserRole.EMPLOYEE, workspaceRole: WorkspaceRole.EMPLOYEE },
	{ name: 'Milde Test Client', email: 'client@milde.test', role: UserRole.CLIENT, workspaceRole: WorkspaceRole.CLIENT },
	{ name: 'Milde Test Contractor', email: 'contractor@milde.test', role: UserRole.CONTRACTOR, workspaceRole: WorkspaceRole.CONTRACTOR },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(testPassword, 12);
	const workspace = await prisma.workspace.upsert({
		where: { slug: 'milde' },
		create: { name: 'Milde', slug: 'milde' },
		update: { name: 'Milde' },
	});

	for (const account of accounts) {
		const user = await prisma.user.upsert({
			where: { email: account.email },
			create: {
				name: account.name,
				email: account.email,
				role: account.role,
				passwordHash,
			},
			update: { name: account.name, role: account.role, passwordHash },
		});
		await prisma.workspaceMember.upsert({
			where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
			create: {
				workspaceId: workspace.id,
				userId: user.id,
				role: account.workspaceRole,
			},
			update: { role: account.workspaceRole },
		});
	}

	console.log(`Seeded the Milde workspace and ${accounts.length} development accounts.`);
}

main()
	.catch((error: unknown) => {
		console.error('Failed to seed development accounts:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
