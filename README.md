# Project Tracker

Task and project tracking dashboard built with Angular 16 and the DummyJSON Todos API.

## Setup & Run Instructions

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Angular CLI (optional, `npm install -g @angular/cli@16`)

### Installation & Running

```bash
# Install dependencies
npm install

# Start local dev server (default: http://localhost:4200)
npm start

# Run unit tests
npm test

# Production build
npm run build
```

## Architectural Decisions

### State Management
State is managed using a dedicated RxJS service (`TaskStateService`) with `BehaviorSubject` stores rather than introducing full NgRx:
- Single source of truth for projects, user tasks, pagination, and error states.
- Implements optimistic UI updates with automatic state rollback on API failures.
- Uses `switchMap` and `combineLatest` to prevent race conditions during rapid pagination or project switching.
- Unsubscribes cleanly via Angular's `async` pipe and `takeUntil`.

### Styling Choice
- **Plain SCSS & CSS Variables**: Built with semantic CSS custom properties for colors, spacing, and elevation matching the Figma specifications, avoiding heavy external UI library dependencies (such as Bootstrap or Angular Material).
- **Component-Scoped Styles**: Every component maintains separate `.html`, `.scss`, and `.ts` files.
- **Layout**: Fixed sidebar navigation with an independently scrollable content container to prevent viewport overflowing.

### Trade-offs Made
- **DummyJSON Mock Backend**: DummyJSON's REST API is read-only and mock-only (`POST /todos/add` always returns static ID 151 and does not persist). A lightweight client-side cache layer in `TaskStateService` reconciles local additions and edits with server data across pagination and page refreshes.
- **Failure Simulation Toggle**: Included an in-app toggle in the sidebar to simulate HTTP 500 responses, making it easy to test optimistic rollbacks and error states without needing external proxy tools.

## Anything You'd Improve With More Time
- **End-to-End (E2E) Testing**: Add Cypress or Playwright test suites covering full user journeys (creating projects, adding tasks, verifying pagination and optimistic rollback).
- **Virtual Scrolling**: Implement `@angular/cdk/scrolling` for task tables with hundreds of items to optimize DOM performance.
- **Multi-attribute Filtering & Sorting**: Add client/server sort options (by due date, priority, title) and multi-select filters.
- **Service Worker / PWA**: Add offline caching via `@angular/pwa` so tasks can be queued offline and synced when network connectivity returns.
