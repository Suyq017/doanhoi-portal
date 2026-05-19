import { DataSource } from 'typeorm';

/**
 * Checks whether a user has a specific CTXH permission.
 *
 * Walks the UserRole → Role → Permission chain and returns true if
 * the user has the requested permission code, either globally
 * (organizationId IS NULL) or for the given organization.
 *
 * @param dataSource   TypeORM DataSource (injected from NestJS DI)
 * @param userId       UUID of the user to check
 * @param permissionCode  e.g. "ctxh.activities.create"
 * @param organizationId  Optional — scope the check to a specific org
 */
export async function checkCtxhPermission(
  dataSource: DataSource,
  userId: string,
  permissionCode: string,
  organizationId?: string,
): Promise<boolean> {
  const result = await dataSource.query<{ exists: string }[]>(
    `SELECT 1 AS exists
     FROM   user_roles   ur
     JOIN   role_permissions rp ON rp."roleId"       = ur."roleId"
     JOIN   permissions       p  ON p.id              = rp."permissionId"
     WHERE  ur."userId"         = $1
       AND  p.code              = $2
       AND  ur."isActive"       = true
       AND  p."isActive"        = true
       AND  (
              ur."organizationId" IS NULL
              OR ur."organizationId" = $3
            )
     LIMIT 1`,
    [userId, permissionCode, organizationId ?? null],
  );

  return result.length > 0;
}
