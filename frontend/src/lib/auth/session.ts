import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { AuthUser, LoginResponse, UserRole } from './types';

const USER_KEY = 'milde.user';
const LEGACY_TOKEN_KEY = 'milde.accessToken';

const dashboardByRole: Record<UserRole, string> = {
	OWNER: '/owner',
	EMPLOYEE: '/employee',
	CLIENT: '/client',
	CONTRACTOR: '/contractor'
};

const userRoles = new Set<UserRole>(['OWNER', 'EMPLOYEE', 'CLIENT', 'CONTRACTOR']);

export function saveAuth(auth: LoginResponse): void {
	if (!browser) return;
	localStorage.removeItem(LEGACY_TOKEN_KEY);
	localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function getUser(): AuthUser | null {
	if (!browser) return null;
	localStorage.removeItem(LEGACY_TOKEN_KEY);

	try {
		const value: unknown = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
		if (!value || typeof value !== 'object') return null;

		const candidate = value as Partial<AuthUser>;
		if (
			typeof candidate.id === 'string' &&
			typeof candidate.name === 'string' &&
			typeof candidate.email === 'string' &&
			candidate.role &&
			userRoles.has(candidate.role)
		) {
			return candidate as AuthUser;
		}
	} catch {
		return null;
	}

	return null;
}

export function isAuthenticated(): boolean {
	return Boolean(getUser());
}

export function clearAuth(): void {
	if (!browser) return;
	localStorage.removeItem(LEGACY_TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
}

export async function redirectByRole(role: UserRole): Promise<void> {
	await goto(dashboardByRole[role], { replaceState: true });
}

export async function logout(): Promise<void> {
	try {
		const { apiRequest } = await import('$lib/api');
		await apiRequest('/auth/logout', { method: 'POST' });
	} catch {
		// Clear the local profile even when the API is unreachable.
	}
	clearAuth();
	await goto('/login', { replaceState: true });
}
