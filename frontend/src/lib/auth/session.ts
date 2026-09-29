import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { AuthUser, LoginResponse, UserRole } from './types';

const TOKEN_KEY = 'milde.accessToken';
const USER_KEY = 'milde.user';

const dashboardByRole: Record<UserRole, string> = {
	OWNER: '/owner',
	EMPLOYEE: '/employee',
	CLIENT: '/client',
	CONTRACTOR: '/contractor'
};

const userRoles = new Set<UserRole>(['OWNER', 'EMPLOYEE', 'CLIENT', 'CONTRACTOR']);

export function saveAuth(auth: LoginResponse): void {
	if (!browser) return;
	localStorage.setItem(TOKEN_KEY, auth.accessToken);
	localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function getAccessToken(): string | null {
	if (!browser) return null;
	return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
	if (!browser) return null;

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
	return Boolean(getAccessToken() && getUser());
}

export async function redirectByRole(role: UserRole): Promise<void> {
	await goto(dashboardByRole[role], { replaceState: true });
}

export async function logout(): Promise<void> {
	if (browser) {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
	}
	await goto('/login', { replaceState: true });
}
