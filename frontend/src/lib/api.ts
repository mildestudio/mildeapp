const API_BASE_URL = (
	import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

type ApiRequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	token?: string;
};

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export async function apiRequest<T>(
	path: string,
	{ method = 'GET', body, token }: ApiRequestOptions = {}
): Promise<T> {
	const headers = new Headers({ Accept: 'application/json' });
	if (body !== undefined) headers.set('Content-Type', 'application/json');
	if (token) headers.set('Authorization', `Bearer ${token}`);

	let response: Response;
	try {
		response = await fetch(`${API_BASE_URL}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	} catch {
		throw new ApiError(
			`Can't reach the Milde server. Check that the backend is running at ${API_BASE_URL}.`
		);
	}

	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		// Keep the HTTP status as a useful fallback when the response has no JSON body.
	}

	if (!response.ok) {
		throw new ApiError(readErrorMessage(payload) ?? `Request failed (${response.status}).`, response.status);
	}

	return payload as T;
}

function readErrorMessage(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object' || !('message' in payload)) return;

	const { message } = payload;
	if (typeof message === 'string' && message.trim()) return message;
	if (Array.isArray(message)) {
		const messages = message.filter((item): item is string => typeof item === 'string');
		if (messages.length) return messages.join(' ');
	}
}
