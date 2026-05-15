# Firebase Security Specification

## Data Invariants
1. **Workspace Membership**: A user can only access a workspace's sub-collections (expenses, periods) if their UID is present in the `members` array of the parent `Workspace` document.
2. **Immutable Identity**: `creatorId` and `paidBy` (when set) in an Expense must match the `request.auth.uid` during creation.
3. **Join Code Locking**: A Join Code maps to exactly one workspace and can only be used if the workspace has < 2 members.
4. **Notification Privacy**: Users can only read their own notifications.

## The Dirty Dozen Payloads (Target: DENY)
1. **Shadow Member**: Attempting to read `/workspaces/XYZ/expenses` as a user not in `workspaces/XYZ.members`.
2. **Identity Spoof**: Creating an expense with `creatorId: "another_user"`.
3. **Ghost Field**: Updating a workspace with a field `isAdmin: true` which doesn't exist in schema.
4. **PII Leak**: Reading `/users/TARGET_USER` private info as a random user.
5. **Join Code Takeover**: Deleting a `/joinCodes/CODE` document.
6. **Expense Overwrite**: Updating someone else's expense in a shared workspace (only allowed to update your own or restricted fields).
7. **Terminal State Break**: Updating an `isSettled: true` period to `false`.
8. **Resource Poisoning**: Injecting 1MB string into `expense.description`.
9. **Orphan Write**: Creating an expense for a non-existent workspace.
10. **Shadow Workspace**: Creating a workspace with yourself as a member but not as `createdBy`.
11. **Notification Snipping**: Deleting another user's notification.
12. **Double Join**: Adding a 3rd member to a 2-person workspace.

## Test Strategy
Verified via manual audit and logic flow analysis.
