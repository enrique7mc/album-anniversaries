# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- Services: `{feature}.service.ts` (e.g., `spotify.service.ts`, `pkce.service.ts`)
- Components: `{feature}.component.ts` with sibling `.html` and `.scss` files (e.g., `album-list-item.component.ts`)
- Models/Interfaces: `{name}.ts` (e.g., `album.ts`, `artist.ts`, `image.ts`)
- Specs: `{feature}.spec.ts` co-located with source file (e.g., `album-list-item.component.spec.ts`)

**Functions:**
- camelCase for all function names
- Descriptive names indicating action: `generateCodeVerifier`, `createAuthHeaders`, `mapToArtist`
- Private methods prefixed with underscore for clarity (convention reinforced by TypeScript `private` keyword)
- Static utility methods as static functions: `SpotifyService.albumHadBirthdayPastWeek()`
- Getter methods use `get` prefix: `get altTag(): string`

**Variables:**
- camelCase for all variables
- Observables suffixed with `$`: `artists$`, `artistsWithRecentAlbums$`, `anniversaryRange$`
- Private fields prefixed with underscore: `private _artists`, `private _destroyed$`
- Constants in UPPER_SNAKE_CASE: `MILLISECONDS_IN_WEEK`, `DEV_ARTIST_LIMIT`, `RELEASE_DATE_PRECISION_DAY`
- Boolean prefixes for clarity: `isDev`, `showOverlay`, `showAlbumBirthdayList`, `dropdownOpen`

**Types:**
- Interfaces for data models: `Album`, `Artist`, `Image`
- Interfaces prefixed with `Spotify` for API response types: `SpotifyAlbumResponse`, `SpotifyArtistResponse`
- Shared interfaces stored in `src/app/` root directory

## Code Style

**Formatting:**
- Tool: Prettier 3.6.2
- Config file: `.prettierrc`
- Settings:
  - Single quotes: `true`
  - Tabs: `false`
  - Tab width: 2 spaces
  - Semicolons: `true`
  - Bracket spacing: `true`

**Linting:**
- Tool: TSLint (configured in `tslint.json`)
- Key enforced rules:
  - `no-console`: true (except debug, info, time, timeEnd, trace)
  - `no-debugger`: true
  - `no-shadowed-variable`: true
  - `prefer-const`: true
  - `no-var-keyword`: true
  - `triple-equals`: true (allow null checks)
  - `use-input-property-decorator`: true
  - `use-output-property-decorator`: true
  - `component-class-suffix`: true (all components must end with "Component")
  - `directive-class-suffix`: true

**Automatic Formatting:**
- Code is automatically formatted on commit via pre-commit hook using `lint-staged`
- Configured in `package.json` under `lint-staged`
- Formats: `*.ts`, `*.html`, `*.scss`, `*.css`, `*.json`

## Import Organization

**Order:**
1. Angular core imports (`@angular/...`)
2. Third-party libraries (RxJS, Firebase, etc.)
3. Application services (relative imports from `./service`)
4. Application models (relative imports from `./model`)
5. Application utilities/constants (relative imports)

**Example from `spotify.service.ts`:**
```typescript
import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { mergeMap, map, filter, tap, bufferCount, switchMap, catchError } from 'rxjs/operators';
import { artistsLocalUrl } from './constants';
import { Artist } from './artist';
import { Album } from './album';
```

**Path Aliases:**
- Not currently used in the codebase; all imports are relative paths
- Consistent use of relative imports: `import { Album } from '../album'`

## Error Handling

**Patterns:**
- Errors in HTTP calls handled via `catchError` RxJS operator (when implemented)
- Service validation occurs in HTTP header creation (e.g., `createAuthHeaders`)
- Component error boundaries not extensively implemented; relies on RxJS observable error handling
- PKCE service throws explicit `Error` with descriptive message for missing crypto API:
  ```typescript
  throw new Error('Web Crypto API is not available...');
  ```

## Logging

**Framework:** Console (no logging library)

**Patterns:**
- Console restricted by linter: `debug`, `info`, `time`, `timeEnd`, `trace` blocked
- Used for debugging in `AppComponent`: `console.error()` for authentication errors
- OAuth state validation logs state mismatches to help diagnose auth failures

## Comments

**When to Comment:**
- Always include JSDoc comments for public methods and functions
- Use inline comments for complex logic (e.g., date calculations with timezone handling)
- Comment magic numbers with rationale (e.g., "604800000 ms = 1 week")
- TODO comments allowed for known future work (e.g., "TODO(me): figure out a better way")

**JSDoc/TSDoc:**
- Used extensively in services
- Format: `/** * Description */` for all public methods
- Include `@param` and `@returns` tags
- Example from `PkceService`:
  ```typescript
  /**
   * Generates a cryptographically random code verifier (43-128 characters)
   * @param length Length of the code verifier (default 128)
   * @returns Random code verifier string
   */
  generateCodeVerifier(length: number = 128): string
  ```

## Function Design

**Size:** No strict line limit enforced; methods typically 5-30 lines

**Parameters:**
- Descriptive parameter names matching use case
- No excessive parameters; dependency injection preferred for services
- Optional parameters marked with `?` or default values
- Example: `generateCodeVerifier(length: number = 128)`

**Return Values:**
- Explicitly typed return values
- Observable return types for async operations: `Observable<Artist[]>`
- Promise return types for async functions: `Promise<string>`
- Getter methods return direct values: `get altTag(): string`

## Module Design

**Exports:**
- Single responsibility per service/component
- Services exported as classes decorated with `@Injectable`
- Models exported as interfaces or type definitions
- Components exported as classes decorated with `@Component`

**Barrel Files:**
- Not used in this codebase
- Each file imports from its specific source

## Component-Specific Patterns

**Change Detection:**
- `ChangeDetectionStrategy.OnPush` enforced on all components
- Used in: `AlbumListItemComponent`, `ArtistCardComponent`
- Critical for performance with large lists
- Input properties must be objects/arrays for change detection to work properly

**Lifecycle Hooks:**
- `OnInit` for initialization logic
- `OnDestroy` for cleanup: always unsubscribe using RxJS `takeUntil`
- `AfterViewInit` for accessing `@ViewChild` references
- Example from `AppComponent`: uses `_destroyed$` Subject for cleanup

**Decorators:**
- `@Input()` for component properties
- `@ViewChild()` for template references with `{ static: false }` (references inside *ngIf)
- `@ViewChildren()` for QueryList access to multiple elements

**Template References:**
- ElementRef used for direct DOM access when needed
- @ViewChild decorated properties named with pattern: `{name}Ref` (e.g., `wrapperRef`, `cardRef`)

## Service Design

**Dependency Injection:**
- `providedIn: 'root'` for singleton services
- Constructor injection pattern for all dependencies
- Configuration injected via `@Inject(APP_CONFIG)`

**BehaviorSubject Pattern:**
- Used for maintaining application state
- Example from `SpotifyService`: `_artists` BehaviorSubject for artist list
- Exposed via observable getter: `get artists(): Observable<Artist[]>`

---

*Convention analysis: 2026-01-31*
