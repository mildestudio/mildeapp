export type UserRole = 'OWNER' | 'EMPLOYEE' | 'CLIENT' | 'CONTRACTOR';

export interface AuthUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
}

export interface LoginResponse {
	user: AuthUser;
}
