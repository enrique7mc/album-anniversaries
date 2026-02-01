# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5.2 - Complete codebase (source, tests, configuration)
- HTML5 - Component templates in `src/app/**/*.component.html`
- SCSS - Component styling and global styles in `src/app/**/*.component.scss` and `src/styles.scss`

**Secondary:**
- CSS 3 - Tailwind CSS utilities via PostCSS processing
- JSON - Configuration files (`package.json`, `tsconfig.json`, `angular.json`)

## Runtime

**Environment:**
- Node.js (no specific version pinned; package-lock.json indicates compatibility with Node 18+)

**Package Manager:**
- npm (lockfile: `package-lock.json` present, lockfileVersion 2)

## Frameworks

**Core:**
- Angular 17.0.0 - Full SPA framework (`@angular/core`, `@angular/common`, `@angular/platform-browser`, `@angular/router`, `@angular/forms`, `@angular/compiler`, `@angular/animations`)
- Angular CLI 17.0.0 - Build tooling and development server

**Backend/Cloud:**
- Firebase 10.0.0 - Hosting and cloud functions integration via `src/environments/`
- AngularFire 17.0.0 - Firebase integration layer (`@angular/fire`)

**UI Components & Icons:**
- Lucide Angular 0.555.0 - SVG icon library with tree-shaking support
- Tailwind CSS 4.1.18 - Utility-first CSS framework (dev dependency)

**Styling & Animation:**
- GSAP (GreenSock Animation Platform) 3.13.0 - High-performance animations for scroll effects and album grid animations
- AutoPrefixer 10.4.22 - CSS vendor prefix management
- PostCSS 8.5.6 - CSS transformation pipeline

**Testing:**
- Karma 6.4.0 - Test runner
- Jasmine 4.5.0 - BDD testing framework
- Jasmine Spec Reporter 7.0.0 - Enhanced test output formatting
- Karma Chrome Launcher 3.2.0 - Chrome-based test execution
- Karma Coverage 2.2.0 - Code coverage reporting
- Karma Jasmine 5.1.0 - Jasmine adapter for Karma
- Karma Jasmine HTML Reporter 2.0.0 - HTML coverage reports

**Build & Dev Tools:**
- Angular DevKit 17.0.0 - Build pipeline (`@angular-devkit/build-angular`)
- TypeScript Compiler 5.2.0 - (`@angular/compiler-cli`, `@angular/language-service`)
- RxJS 7.8.0 - Reactive programming for async operations and data streams

**Code Quality & Git Hooks:**
- Prettier 3.6.2 - Code formatting (`src/**/*.{ts,html,scss,css,json}`)
- Husky 9.1.7 - Git hooks manager
- lint-staged 16.2.6 - Pre-commit hook for formatting (configured in `package.json`)

**Development Utilities:**
- json-server 1.0.0-beta.3 - Mock API server for development (`server/db.json`)
- ts-node 10.9.1 - TypeScript Node.js execution
- Firebase Tools 13.35.1 - Firebase CLI for deployment

## Key Dependencies

**Critical:**
- `@angular/core` 17.0.0 - Dependency injection, decorators, component lifecycle
- `@angular/fire` 17.0.0 - Firebase SDK integration (hosting, cloud functions)
- `firebase` 10.0.0 - Firebase SDK (direct SDK usage if needed)
- `rxjs` 7.8.0 - Observable-based reactive patterns for API calls, data streams, and event handling
- `zone.js` 0.14.0 - Angular's zone management for change detection

**Infrastructure:**
- `tslib` 2.5.0 - TypeScript runtime helpers
- `core-js` 3.30.0 - Polyfills for ES features
- `@types/jasmine` 4.3.0 - TypeScript definitions for testing
- `@types/node` 20.0.0 - TypeScript definitions for Node.js (used in build configuration)

## Configuration

**Environment:**
- Development: `src/environments/environment.ts` - Uses HTTP redirect URI (`http://127.0.0.1:4200`) for local OAuth
- Production: `src/environments/environment.prod.ts` - Uses HTTPS redirect URI (`https://album-anniversaries.firebaseapp.com/`)
- Environment variables loaded via `src/environments/` at build time (not runtime `.env` files)

**Critical Environment Variables:**
- Spotify Client ID - Stored in `src/constants.ts` (public key)
- Firebase Config - Project ID, API key, database URL in `environment.ts` and `environment.prod.ts`
- Redirect URIs - Must be configured in Spotify Developer Dashboard for each environment

**Build:**
- `angular.json` - Angular CLI configuration with development and production targets
- `tsconfig.json` - TypeScript compiler options (ES2022 target, ES2018 lib)
- `src/tsconfig.app.json` - Application-specific TypeScript config
- `src/tsconfig.spec.json` - Test-specific TypeScript config
- `src/karma.conf.js` - Karma test runner configuration

## Platform Requirements

**Development:**
- macOS, Linux, or Windows with Node.js 18+
- Chrome/Chromium for tests (Karma Chrome Launcher)
- HTTPS support for Safari development (crypto.subtle requires secure context)
- Local IP address knowledge for mobile testing (configured via `--host 0.0.0.0`)

**Production:**
- Firebase Hosting (auto-configured via `firebase.json`)
- Supports Chrome, Firefox, Safari, Edge (ES2022 target)

## Build Output & Optimization

**Build Configuration:**
- `dist/spotify-demo/` - Output directory
- Production builds use:
  - Output hashing on all files
  - Bundle size budgets: 500kb initial, 1mb max for main bundles
  - Component styles: 6kb warning, 8kb error per component

**Source Maps:**
- Enabled in development for debugging
- Disabled in production for file size

---

*Stack analysis: 2026-01-31*
