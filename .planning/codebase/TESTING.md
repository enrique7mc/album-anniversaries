# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Karma 6.4.0
- Config: `src/karma.conf.js`
- Framework adapter: `@angular-devkit/build-angular`

**Assertion Library:**
- Jasmine 4.5.0

**Run Commands:**
```bash
npm test                                    # Run all tests in watch mode (auto-reruns on file changes)
npm test -- --no-watch                     # Run all tests once and exit
npm test -- --code-coverage --no-watch     # Run tests with coverage report
npm test -- --include='**/service.spec.ts' --no-watch  # Run specific test file
```

**Coverage Tool:**
- karma-coverage 2.2.0
- Report formats: HTML, LCOV, text-summary
- Output: `coverage/` directory

## Test File Organization

**Location:**
- Co-located with source files (same directory)
- Never in separate `__tests__` or `tests/` directory

**Naming:**
- Pattern: `{feature}.spec.ts`
- Examples: `spotify.service.spec.ts`, `album-list-item.component.spec.ts`

**Structure:**
```
src/app/
├── spotify.service.ts
├── spotify.service.spec.ts          # Co-located test file
├── album-list-item/
│   ├── album-list-item.component.ts
│   └── album-list-item.component.spec.ts
└── artist-card/
    ├── artist-card.component.ts
    └── artist-card.component.spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ServiceName],
    });
    service = TestBed.inject(ServiceName);
  });

  describe('methodName', () => {
    it('should do something', () => {
      expect(result).toBe(expectedValue);
    });
  });
});
```

**Patterns:**

**Service Setup:**
```typescript
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [{ provide: APP_CONFIG, useValue: SPOTIFY_APP_CONFIG }],
  });
  service = TestBed.inject(ServiceName);
});
```

**Component Setup:**
```typescript
beforeEach(waitForAsync(() => {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    declarations: [ComponentName],
  }).compileComponents();
}));

beforeEach(() => {
  fixture = TestBed.createComponent(ComponentName);
  component = fixture.componentInstance;
  debugElement = fixture.debugElement;
  component.input = mockData;
  fixture.detectChanges();
});
```

**Cleanup:**
- Session/local storage cleared in `beforeEach` and `afterEach` (used in PkceService tests)
- Subjects destroyed using `takeUntil` pattern in component cleanup
- Example from `PkceService`:
  ```typescript
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });
  ```

## Mocking

**Framework:** Jasmine spies

**Patterns:**

**Service Mocking:**
```typescript
const spy = jasmine.createSpyObj('ServiceName', ['methodName']);
TestBed.configureTestingModule({
  providers: [
    { provide: ServiceName, useValue: spy },
  ],
});
```

**Date Mocking:**
```typescript
spyOn(Date, 'now').and.returnValue(new Date('2025-01-05T12:00:00').getTime());
```

**What to Mock:**
- External HTTP services (use `HttpClientTestingModule` instead of actual HTTP)
- Firebase Functions (provide empty spy object)
- Date.now() for time-dependent tests
- External services injected via dependency injection

**What NOT to Mock:**
- Internal helper functions that are part of the class being tested
- Static utility methods like `SpotifyService.albumHadBirthdayPastWeek()`
- Getters and basic data transformations
- Model/interface implementations

## Fixtures and Factories

**Test Data:**
- Created inline in test files
- Shared mock objects defined at top of describe block
- Example from `AlbumListItemComponent.spec.ts`:
  ```typescript
  const mockAlbum: Album = {
    id: 'album-123',
    artist_id: 'artist-456',
    name: 'Test Album',
    release_date: '2023-01-15',
    release_date_precision: 'day',
    images: mockImages,
    external_url: 'https://open.spotify.com/album/test',
  };
  ```

**Location:**
- Mock data defined in same spec file
- Helper functions for creating test data at top of describe block
- Example from `spotify.service.spec.ts`:
  ```typescript
  const createLocalDateString = (daysOffset: number, year?: number): string => {
    // Helper implementation
  };

  const createAlbum = (releaseDate: string): Album => ({
    // Factory implementation
  });
  ```

## Coverage

**Requirements:** No enforced coverage threshold

**Current Status (as of CLAUDE.md):**
- Total Tests: 124 (all passing as of latest commit)
- Coverage: 35.67%
  - Statements: 35.67%
  - Branches: 30.3%
  - Functions: 29.82%
  - Lines: 35.71%

**Well-tested areas:**
- PkceService: 18 tests (cryptographic operations)
- AlbumListItemComponent: 37 tests (album display component)
- ArtistCardComponent: 25 tests (artist card component)
- SpotifyService date logic: 23 tests (date filtering for anniversaries)

**Areas needing tests:**
- AppComponent OAuth/PKCE flow: ~2 tests (needs ~25 more)
- SpotifyService HTTP integration: ~1 test (needs ~15 more)

**View Coverage:**
```bash
npm test -- --code-coverage --no-watch
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

## Test Types

**Unit Tests:**
- Scope: Individual service methods, component getters, utility functions
- Approach: Pure function testing with test data
- Example: `albumHadBirthdayPastWeek()` tests verify date logic
- Location: All service and component spec files

**Integration Tests:**
- Scope: Component rendering with input changes, service composition
- Approach: Tests that verify multiple pieces work together
- Example: Component input change tests verify template updates
- Location: `*.component.spec.ts` files with `Integration Tests` describe blocks

**E2E Tests:**
- Status: Not implemented
- Framework: Not configured

## OnPush Change Detection Testing Pattern

Components use `ChangeDetectionStrategy.OnPush` which requires special testing considerations for input changes:

**Problem:** When testing input changes on `@Input()` properties after component initialization, modifying the property doesn't trigger change detection properly with OnPush strategy.

**Solution:** Create fresh fixture instances for each test case that needs different input values.

```typescript
// ❌ Problematic pattern - change detection may not work
it('should handle null name', () => {
  component.album = { ...mockAlbum, name: null };
  fixture.detectChanges(); // May not trigger with OnPush
  // Test may fail unexpectedly
});

// ✅ Correct pattern - fresh fixture with OnPush
it('should handle null name', () => {
  const newFixture = TestBed.createComponent(AlbumListItemComponent);
  const newComponent = newFixture.componentInstance;
  newComponent.album = { ...mockAlbum, name: null };
  newFixture.detectChanges(); // Reliable with fresh instance
  expect(newComponent.altTag).toBe('Album cover');
});
```

**When to use:** Any test that modifies input properties and needs to verify the DOM reflects those changes.

**Examples in codebase:**
- `AlbumListItemComponent.spec.ts` - Test "should update display when album input changes" (line 193)
- Tests creating fresh fixtures for different album configurations

## Common Patterns

**Async Testing:**
```typescript
beforeEach(waitForAsync(() => {
  TestBed.configureTestingModule({...}).compileComponents();
}));
```

**Error Testing:**
```typescript
it('should not throw with Safari ISO date format', () => {
  expect(() =>
    SpotifyService.albumHadBirthdayPastWeek(album)
  ).not.toThrow();
});
```

**Observable Testing with Spies:**
```typescript
const spy = jasmine.createSpyObj('Service', ['method']);
spy.method.and.returnValue(of(expectedValue));
```

**Date-based Testing:**
- Use helper functions to create date strings in local timezone
- Mock `Date.now()` for reproducible tests
- Example pattern:
  ```typescript
  const createLocalDateString = (daysOffset: number, year?: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    if (year !== undefined) {
      date.setFullYear(year);
    }
    return `${yyyy}-${mm}-${dd}`;
  };
  ```

## Test Naming Conventions

**Describe Blocks:**
- Primary: Feature name (e.g., `describe('PkceService', ...)'`)
- Secondary: Method or feature group (e.g., `describe('generateCodeVerifier', ...)`)
- Tertiary: Edge cases or integration (e.g., `describe('Integration Tests', ...)`)

**Test Cases:**
- Start with "should": `it('should generate a code verifier with default length')`
- Describe specific behavior: `it('should return true for album birthday 6 days ago')`
- Test edge cases: `it('should handle null album name')`
- Test error conditions: `it('should throw error when crypto API is unavailable')`

---

*Testing analysis: 2026-01-31*
