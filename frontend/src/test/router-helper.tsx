import React, { ReactNode } from 'react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';

/**
 * Test helper to wrap components with MemoryRouter configured with future flags
 * This suppresses React Router v7 deprecation warnings in tests
 * 
 * Usage: 
 * const component = renderWithRouter(<MyComponent />, { initialEntries: ['/path'] });
 */
export const renderWithRouter = (
	children: ReactNode,
	routerProps?: MemoryRouterProps
) => {
	return (
		<MemoryRouter
			{...routerProps}
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			{children}
		</MemoryRouter>
	);
};

/**
 * Wrapper component for easier JSX usage in tests
 */
export const TestRouter: React.FC<{ children: ReactNode } & MemoryRouterProps> = ({
	children,
	...props
}) => {
	return (
		<MemoryRouter
			{...props}
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			{children}
		</MemoryRouter>
	);
};
