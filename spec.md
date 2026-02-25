# Specification

## Summary
**Goal:** Build the Scrambly Mod Hub — a moderation platform with three distinct roles (Admin, Moderator, User) featuring a full moderation workflow including warnings, bans, ban appeals, and moderator reporting.

**Planned changes:**

### Backend
- Define stable data entities: User, Moderator, Warning, ModeratorReport with all specified fields
- Hardcode admin identity to "Jourdain Rodriguez"
- Implement moderator actions: `issueWarning(userId, reason)`, `banUser(userId, reason)`, `instantBanUser(userId)` — restricted to active (non-banned) moderators
- Implement ban appeal system: `submitAppeal(userId, appealText)`, `reviewAppeal(userId, decision)` (admin-only), `getMyAppealStatus(userId)`
- Implement moderator reporting: `reportModerator(moderatorId, reason)` (only users with ≥1 warning), `getModeratorReports()` (admin-only), `resolveModeratorReport(reportId, banModerator)` (admin-only)

### Frontend
- **Admin Panel** (Jourdain Rodriguez only): sections for managing moderators (list + ban button), pending moderator reports (ban/dismiss actions), and pending ban appeals (approve/deny actions)
- **Moderator Dashboard** (active moderators only): searchable user list with status/warning count, per-user inline forms for Issue Warning, Ban User, and one-click Instant Ban for pornographic content; all actions disabled with suspension notice if moderator is banned
- **User Status Page**: displays ban status and reason, ban appeal form (if banned and no pending appeal), appeal status display, warning history list, and moderator report form (visible if user has ≥1 warning)
- **Visual design**: dark charcoal theme, red-orange for destructive actions, teal/green for approvals, card-based layout, clean sans-serif typography

**User-visible outcome:** Moderators can warn and ban users (including instant bans for pornographic content) via a dashboard. Banned users can submit appeals reviewed by the admin. Users with warnings can report moderators to the admin. The admin (Jourdain Rodriguez) has a dedicated panel to manage moderators, resolve reports, and handle appeals.
