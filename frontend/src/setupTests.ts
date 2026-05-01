import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { vi } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ============================================================
// i18next TEST SETUP - Fix NO_I18NEXT_INSTANCE warnings
// ============================================================
if (!i18n.isInitialized) {
	i18n
		.use(initReactI18next)
		.init({
			lng: 'vi',
			fallbackLng: 'vi',
			resources: {
				vi: {
					translation: {
						// Minimal test translation resources
						// In production, these are loaded from backend
					},
				},
			},
			interpolation: {
				escapeValue: false,
			},
			react: {
				useSuspense: false, // Important for tests to avoid Suspense errors
			},
		});
}

// ============================================================
// URL API POLYFILL
// ============================================================
if (!window.URL.createObjectURL) {
	window.URL.createObjectURL = vi.fn(() => 'blob:mock-url') as any;
}

if (!window.URL.revokeObjectURL) {
	window.URL.revokeObjectURL = vi.fn() as any;
}

// ============================================================
// WARNING SUPPRESSION
// ============================================================
// Suppress React Router v7 future flag warnings and act(...) warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
	const msg = args[0]?.toString() || '';
	if (
		msg.includes('React Router Future Flag Warning') ||
		msg.includes('v7_startTransition') ||
		msg.includes('v7_relativeSplatPath')
	) {
		return; // Suppress React Router future flag warnings
	}
	originalWarn(...args);
};

console.error = (...args: any[]) => {
	const msg = args[0]?.toString() || '';
	// Suppress act(...) warnings from ActivityDetail/ParticipantManagement async flows
	if (msg.includes('Warning: An update to') && msg.includes('was not wrapped in act(...)')) {
		return;
	}
	originalError(...args);
};

// ============================================================
// MSW (Mock Service Worker) SETUP
// ============================================================
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
