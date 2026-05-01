import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { vi } from 'vitest';

if (!window.URL.createObjectURL) {
	window.URL.createObjectURL = vi.fn(() => 'blob:mock-url') as any;
}

if (!window.URL.revokeObjectURL) {
	window.URL.revokeObjectURL = vi.fn() as any;
}

// Establish API mocking before all tests.
beforeAll(() => {
	server.listen({ onUnhandledRequest: 'warn' });

	const mswFetch = globalThis.fetch.bind(globalThis);
	globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
		if (typeof input === 'string' && input.startsWith('/')) {
			return mswFetch(new URL(input, window.location.origin).toString(), init);
		}

		if (input instanceof Request && input.url.startsWith('/')) {
			return mswFetch(new Request(new URL(input.url, window.location.origin).toString(), input), init);
		}

		return mswFetch(input, init);
	}) as typeof fetch;
});
// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(() => server.resetHandlers());
// Clean up after the tests are finished.
afterAll(() => server.close());
