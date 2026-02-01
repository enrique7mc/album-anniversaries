# Phase 1: Service Abstraction & UI Foundation - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor existing Spotify code to use provider-agnostic MusicService interface and add Apple Music sign-in button to existing UI. Existing Spotify functionality must work identically after refactoring.

</domain>

<decisions>
## Implementation Decisions

### Landing page layout
- Side-by-side buttons on desktop, stacked on mobile (responsive)
- Keep existing UI structure — just add the second sign-in button alongside Spotify
- No new hero section or header changes needed

### Button styling
- Use official provider brand colors:
  - Spotify: #1DB954 (Spotify green)
  - Apple Music: Official gradient or Apple Music pink/red
- Service logos/icons on buttons for instant recognition

### Claude's Discretion
- Exact responsive breakpoint for stack transition
- Button sizing and spacing
- Icon placement within buttons (left, center, etc.)
- MusicService interface design and implementation pattern
- Component injection token approach

</decisions>

<specifics>
## Specific Ideas

- "Keep as is, just add the second button" — minimal UI change, preserve existing look and feel
- Buttons should feel equally weighted — neither service appears preferred

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-service-abstraction-ui-foundation*
*Context gathered: 2026-02-01*
