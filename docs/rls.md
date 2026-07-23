# PostgreSQL Row-Level Security (RLS) in HRMS

## Overview
To ensure strict mandantentrennung (tenant isolation), this project utilizes PostgreSQL Row-Level Security (RLS). RLS ensures that database access is restricted based on the current session context, preventing data leaks between tenants even if a developer forgets a `where: { tenantId: ... }` clause in a query.

## Mechanism: The `withTenant` Wrapper
The application uses a custom wrapper called `withTenant` (`src/lib/db/tenant.ts`). 

1. When a request is made, the `tenantId` is retrieved from the authenticated session.
2. `withTenant` starts a Prisma transaction.
3. It executes `SET LOCAL app.current_tenant = '${tenantId}'`.
4. All queries within that transaction are now subject to the RLS policies that check against `current_setting('app.current_tenant')`.

## Table Configuration

### Tenant-Isolated Tables
The following tables have RLS enabled and are isolated by `tenant_id`:
- `users`
- `roles`
- `role_permissions`
- `user_roles`
- `user_permissions`
- `files`
- `audit_logs` (Append-only)
- `tenant_settings`
- `tenant_modules`
- `employees`

### Global Tables
These tables are not subject to RLS as they contain system-wide data or are used for global identification:
- `tenants` (though access to a specific tenant's record is restricted via policies)
- `permissions`
- `module_definitions`
- `login_attempts`

## Special Cases
### Audit Logs
The `audit_logs` table is configured as **append-only**. 
- `INSERT` and `SELECT` are allowed.
- `UPDATE` and `DELETE` are implicitly denied by the absence of corresponding policies, ensuring an immutable audit trail.

## Infrastructure Requirements
### Database User Permissions
For RLS to be effective, the application must connect to the database using a user that does **not** have the `BYPASSRLS` attribute. 

- **`DATABASE_URL`**: Used by the application. Must be a restricted user (`NOBYPASSRLS`).
- **`DIRECT_URL`**: Used by Prisma Migrate. Must be a superuser or have sufficient privileges to alter tables and policies.

## Verification
RLS can be verified using the `scripts/verify-rls.ts` script, which tests cross-tenant isolation and the immutability of the audit log.
