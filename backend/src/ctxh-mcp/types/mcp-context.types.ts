/**
 * Context object injected into every MCP tool handler via closure.
 * Populated from the validated JWT in the HTTP controller before
 * the McpServer is built.
 */
export interface McpRequestContext {
  /** UUID from JWT payload (user.id) */
  userId: string;
  /** User type from user entity */
  userType: 'student' | 'staff';
  /** Organization context — optional, used for scoping staff tools */
  organizationId?: string;
}
