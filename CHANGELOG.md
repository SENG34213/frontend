# Changelog

All notable changes to the Gaming Castle frontend will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
