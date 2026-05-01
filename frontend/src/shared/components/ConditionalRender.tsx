import React, { ReactNode } from 'react';

interface ConditionalRenderProps {
    condition: boolean;
    children: ReactNode;
    fallback?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
    condition,
    children,
    fallback = null,
}) => {
    return condition ? <>{children}</> : <>{fallback}</>;
};
