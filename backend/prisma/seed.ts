import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
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
	{ name: 'Milde Test Owner', email: 'owner@milde.test', role: UserRole.OWNER },
	{ name: 'Milde Test Employee', email: 'employee@milde.test', role: UserRole.EMPLOYEE },
	{ name: 'Milde Test Client', email: 'client@milde.test', role: UserRole.CLIENT },
	{ name: 'Milde Test Contractor', email: 'contractor@milde.test', role: UserRole.CONTRACTOR },
] as const;

async function main() {
	const passwordHash = await bcrypt.hash(testPassword, 12);

	for (const account of accounts) {
		await prisma.user.upsert({
			where: { email: account.email },
			create: { ...account, passwordHash },
			update: { name: account.name, role: account.role, passwordHash },
		});
	}

	console.log(`Seeded ${accounts.length} development accounts.`);
}

main()
	.catch((error: unknown) => {
		console.error('Failed to seed development accounts:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
