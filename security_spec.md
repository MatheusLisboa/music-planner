# Security Specification - Music Planner

## 1. Data Invariants
- Every document must have a `tenant_id`.
- A user can only access data where the document's `tenant_id` matches the `tenant_id` in their user profile record.
- Only users with `role == 'admin'` or `'super_admin'` can create services, schedules, and songs within their tenant.
- A user can only create/edit their own availability (`user_id == request.auth.uid`).
- Super Admins have global access to all tenants for maintenance.

## 2. The "Dirty Dozen" Payloads (Attacks)
1. **Tenant Escape**: User A (Tenant 1) tries to read a Service from Tenant 2.
2. **Identity Spoofing**: User A tries to create an Availability record for User B.
3. **Role Escalation**: Member tries to update their own role to 'admin' in the `users` collection.
4. **ID Poisoning**: Creating a song with a 1MB string as the document ID.
5. **Ghost Field Injection**: Adding `isVerified: true` to a church document.
6. **Orphaned Write**: Creating a schedule for a `service_id` that doesn't exist.
7. **Terminal State Bypass**: Updating a confirmed schedule to 'pending' after it's already finished.
8. **PII Leak**: Non-admin user trying to list all users across all churches.
9. **Blanket Read**: Unauthenticated user trying to get a list of all churches.
10. **Shadow Tenant Creation**: Member trying to create a new `Church` document.
11. **Timestamp Forgery**: Sending a manual `createdAt` string instead of `serverTimestamp()`.
12. **Recursive Cost Attack**: Deeply nested document ID strings to exhaust parsing resources.

## 3. Test Runner (Mock)
A suite of tests will verify:
- `get` on foreign tenant document -> PERMISSION_DENIED.
- `create` with mismatched `tenant_id` -> PERMISSION_DENIED.
- `update` role field by non-super-admin -> PERMISSION_DENIED.
- `delete` church by church admin -> PERMISSION_DENIED.
