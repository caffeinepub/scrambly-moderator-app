# Specification

## Summary
**Goal:** Add a persistent floating background music player and a Settings page with music controls to the Scrambly Moderator app.

**Planned changes:**
- Create a `FloatingMusicPlayer` component fixed to the bottom-right corner of all pages, using the YouTube IFrame API to play a pre-defined rotation of 8 Sonic tracks (Angel Island Zone Act 1, Act 2, Chemical Plant Zone, Green Hill Zone, Emerald Hill Zone, Ice Cap Zone, Flying Battery Zone, Hydrocity Zone)
- Player includes left/right arrow buttons to cycle tracks, an On/Off toggle, a volume slider (0–100) with nudge buttons (±5), auto-loop, current track name display, and state persistence via sessionStorage
- Mount `FloatingMusicPlayer` in the root app layout so it renders on every route without resetting on navigation
- Create a new `SettingsPage` at `/settings` (auth-guarded) with a Background Music section listing all 8 tracks with Select buttons, track highlighting, a YouTube URL import field to add custom tracks for the session, a volume slider, and an On/Off toggle synced with the floating player via sessionStorage
- Add a "Settings" navigation link in the main navbar, visible only to authenticated users, routing to `/settings`
- Register the `/settings` route in the TanStack Router configuration with an AuthGuard

**User-visible outcome:** Authenticated users hear background Sonic music that persists across all pages, can switch tracks and adjust volume from the floating player or the new Settings page, and can add custom YouTube tracks for their session.
