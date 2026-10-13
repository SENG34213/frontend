# Gaming Castle — Frontend Web Application (SENG 34213)

![CI Pipeline](https://img.shields.io/badge/CI-Passing-10b981?style=for-the-badge&logo=githubactions)
![Tests](https://img.shields.io/badge/Coverage-≥80%25-2563eb?style=for-the-badge&logo=jest)
![Angular](https://img.shields.io/badge/Angular-19.2-dd0031?style=for-the-badge&logo=angular)
![WCAG](https://img.shields.io/badge/WCAG-2.1_AA-8b5cf6?style=for-the-badge)

Client-side Single Page Application (SPA) for the **Gaming Castle** online lounge management system. Built strictly according to the University SENG 34213 course guidelines, the approved SRS/SDS specifications, and the UI wireframes.

---

## 1. Architectural Highlights (Phase F0 Foundation)

- **Standalone Components & Signal State (FE-01 / ADR-F01)**: No NgRx boilerplate. Reactive Angular signals (`computed`, `signal`) manage auth state, role extraction, and UI feedback.
- **Design System & UI Kit (FE-01)**: Custom dark cyberpunk tokens matching the approved wireframes:
  - Base: `#080b11`, Card Surface: `#131a2c`, Cyber Blue: `#2563eb`, Neon Purple: `#8b5cf6`
  - Slot Status: Available `#10b981` (Green), Occupied `#ef4444` (Red), Warning `#f59e0b` (Amber)
  - Standalone reusable UI components: `<gc-button>`, `<gc-input>`, `<gc-select>`, `<gc-card>`, `<gc-badge>`, `<gc-modal>`, `<gc-toast-container>`, `<gc-skeleton>`, `<gc-empty-state>`, `<gc-pagination>`, `<gc-tabs>`.
  - Dev-only interactive living styleguide at `/styleguide`.
- **Environment & Typed API Layer (FE-02)**: Strongly-typed models mirroring Spring Boot backend DTOs (`auth`, `station`, `booking`, `payment`, `tournament`, `loyalty`), type-safe base `ApiService`, and in-memory mock adapter capability (`MockDataService`).
- **HTTP Pipeline & NFR-08 Compliance (FE-03)**:
  - `ErrorMapper`: Maps HTTP and backend errors to plain English messages with concrete corrective actions.
  - `authInterceptor`: Automatically attaches JWT Bearer token to protected calls.
  - `errorInterceptor`: Captures 401 unauthenticated errors, clears tokens, preserves `returnUrl`, navigates to `/login` with notification; handles 403 by navigating to `/forbidden`.
- **App Shells & Navigation (FE-04)**:
  - `PublicLayoutComponent`: Clean guest header and footer.
  - `CustomerLayoutComponent`: Responsive topbar, loyalty widget, user role badge, mobile drawer, and session expiration warning banner.
  - `AdminLayoutComponent`: Collapsible administrative sidebar with route navigation and system status.
- **Auth Hardening & Expiration Detection (FE-05)**:
  - Base64Url JWT decoder (extracts `sub`, `email`, `role`, `exp`).
  - Active session countdown notifying the user ~2 minutes before expiration.
- **CI Gates (FE-06)**:
  - 80% coverage threshold enforced by Karma (`karma.conf.js`).
  - `npm audit --audit-level=high` gate.
  - GitHub Actions automated pipeline in `.github/workflows/ci.yml`.
- **Container & Staging Deployment (FE-07)**:
  - Multi-stage Dockerfile (`node:20-alpine` -> `nginx:alpine`).
  - Nginx reverse-proxies `/api/` traffic to `api-gateway:8080`, enforces SPA fallback, and serves strict OWASP security headers (`CSP`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`).

---

## 2. Route Table

| Route | Component | Layout | Guards | Purpose / Wireframe Ref |
|---|---|---|---|---|
| `/styleguide` | `StyleguideComponent` | Standalone | None | Living UI kit demonstration & token tester (FE-01) |
| `/login` | `LoginComponent` | Public | `guestGuard` | Customer & Admin login with `returnUrl` support (Fig 2) |
| `/register` | `RegisterComponent` | Public | `guestGuard` | Customer account registration (Fig 3) |
| `/dashboard` | `DashboardComponent` | `CustomerLayout` | `authGuard` | Customer primary landing and quick actions (Fig 1) |
| `/admin` | `DashboardComponent` | `AdminLayout` | `roleGuard` (ADMIN) | Administrative operations overview (Fig C.15) |
| `/forbidden` | `ForbiddenComponent` | Standalone | None | 403 Access Denied page with safe return navigation |
| `/404` | `NotFoundComponent` | Standalone | None | 404 Level Not Found page with dashboard redirect |
| `**` | Redirect to `/404` | — | None | Wildcard catch-all fallback |

---

## 3. Getting Started

### Local Development
```bash
# Install dependencies
npm ci

# Start the Angular development server (proxies /api to localhost:8080)
npm start
```
Navigate to `http://localhost:4200/`.

### Linting & Code Quality
```bash
npm run lint
```

### Running Unit Tests & Coverage
```bash
# Run headless Chrome tests with 80% coverage enforcement
npm test -- --watch=false --browsers=ChromeHeadless
```

### Docker Container
```bash
# Build production image
docker build -t gaming-castle/frontend:latest .

# Run container locally
docker run -p 4200:80 gaming-castle/frontend:latest
```
Or start via Docker Compose in `infra/`:
```bash
cd ../infra
docker compose up -d frontend
```
