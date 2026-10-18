# Changelog

All notable changes to the Gaming Castle frontend will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **FE-25-RT: Customer Real-Time Notifications Integration (Socket.IO + Web Audio + UI Kit)**:
  - Integrated `NotificationSocketService` into customer layout header (`CustomerLayoutComponent`) with notification bell icon and pulsing unread counter badge.
  - Embedded `NotificationCenterComponent` configured with `mode="customer"` in customer layout shell.
  - Implemented automatic route resolution in `getNotificationLink` mapping admin broadcast URLs to customer routes (`/bookings`, `/tournaments`, `/dashboard`).
  - Added customer-tailored real-time event simulation (`sendCustomerTestAlert`) with booking confirmation, tournament registration, and loyalty reward payloads.
  - Emitted real-time notifications on customer actions: tournament registrations in `TournamentDetailComponent` & `TournamentsListComponent`, and booking payments in `BookingsComponent`.
  - Comprehensive unit test suites created for `NotificationCenterComponent` (13 tests) and `NotificationSocketService` (9 tests), and updated layout/feature specs with 100% test pass rate (450/450 tests).
- **FE-19: Customer Tournaments Showcase & Grid (`/tournaments`)**:
  - Implemented `TournamentService` with full API integration (`GET /api/tournaments`) and fallback to `MockDataService`.
  - Implemented `TournamentsListComponent` featuring a live countdown clock to the next tournament, status filtering tabs (All, Upcoming & Open, Live Now, Completed, My Registrations), real-time search, game title filtering, and sorting.
  - Interactive tournament cards with capacity meters, spots left progress bar, entry fee in LKR, plain-English capacity/status explanations (NFR-08), and instant registration modal.
  - Comprehensive unit test suite in `tournaments-list.component.spec.ts`.
- **FE-20: Tournament Detail & Registration (`/tournaments/:id`)**:
  - Implemented `TournamentDetailComponent` with header banner, registration deadline countdown, live capacity progression meter, venue specifications (PS5 Pro DualSense Edge Arena), and fair play esports rules.
  - Interactive registration form with gamer tag input, entry fee breakdown, rules acceptance checkbox, and in-flight payment processing via backend `POST /api/tournaments/{id}/register`.
  - User registration status confirmation card with gamer tag, registration timestamp, payment reference, and bracket shortcut.
  - Comprehensive unit test suite in `tournament-detail.component.spec.ts`.
- **FE-21: Tournament Bracket & Match Results (`/tournaments/:id/bracket`)**:
  - Implemented `TournamentBracketComponent` displaying interactive single-elimination tournament knockout bracket tree.
  - Automatically groups matches by rounds (Round of 16, Quarter-Finals, Semi-Finals, Grand Finals).
  - Dynamic Grand Champion showcase banner when champion is crowned.
  - Empty state with informative guidance when bracket has not been generated yet.
  - Comprehensive unit test suite in `tournament-bracket.component.spec.ts`.
- **FE-22: My Tournament Registrations Shortcut (`/my-tournaments`)**:
  - Seamless route redirecting to `/tournaments?tab=my-registrations`.
  - Dedicated "MY REGISTRATIONS" tab displaying count badge and filtered view of current user's registered tournaments.
  - Implemented backend endpoint `GET /api/tournaments/my-registrations` in `TournamentController` and `RegistrationService`.
- **FE-32: Admin Reports & Analytics (`/admin/reports`)**:
  - Implemented `ReportAdminService` with fallback to `MockDataService`.
  - Implemented `AdminReportsComponent` with multi-category intelligence tabs (Revenue & Finance, Station Utilization, Bookings & Channels, Gamer Growth).
  - Implemented time preset filtering (Today, 7 Days, 30 Days, This Month, Custom Date Range).
  - Cyberpunk interactive proportional bar chart with dynamic heights and tooltip badges.
  - Granular audit table with formatted LKR currency and status indicators.
  - CSV report export download and print layout view.
  - Unit test suite in `admin-reports.component.spec.ts`.
- **FE-33: Game Titles Catalog (`/admin/games`)**:
  - Implemented `GameAdminService` with fallback to `MockDataService`.
  - Implemented `AdminGamesComponent` with card grid layout and real-time search & platform filters.
  - Reactive modals for Game Title Creation and Editing with full field validation (NFR-08).
  - Quick toggle button for title active/inactive availability.
  - Safe deletion confirmation modal.
  - Unit test suite in `admin-games.component.spec.ts`.
- **FE-34: Loyalty Rules & Manual Adjustments (`/admin/loyalty`)**:
  - Implemented `LoyaltyAdminService` with fallback to `MockDataService`.
  - Implemented `AdminLoyaltyComponent` with sub-sections for Customer Balances, Rule Formula, and Audit Ledger.
  - Rules configuration editor with threshold and multiplier calculations and real-time simulation preview.
  - Manual Points Adjustment modal with live balance preview and mandatory audit reason logging.
  - Server-paginated customer loyalty accounts table with tier badges.
  - Unit test suite in `admin-loyalty.component.spec.ts`.
