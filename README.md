# Single Supermarket Management System — Frontend

A modern, enterprise-grade, high-performance Single Supermarket Management System frontend built with **React.js**, **Vite**, **TypeScript**, **Tailwind CSS**, **TanStack Query**, **Zustand**, and **IndexedDB**.

This system is strictly architected for **one physical supermarket**. It does not implement branches, branch selectors, or multi-branch transfers — all 20 modules operate cohesively on the same single store's merchandise and cash drawer.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js (v18+ or v20+)
- npm (v9+)

### 2. Run the Frontend
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies (already installed)
npm install

# Start the Vite development server
npm run dev
```

The application will be accessible at: **`http://localhost:5173`**

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **React 19 & TypeScript** | Component architecture with strict type safety |
| **Vite 8** | Ultra-fast HMR and bundle compilation |
| **Tailwind CSS v4** | Consistent blue, white, black, and dark navy enterprise theme |
| **TanStack Query (React Query v5)** | Asynchronous server-state management, caching & polling |
| **Zustand** | POS checkout cart, session, theme, and offline sync store |
| **React Router DOM (v7)** | Client-side routing for all 20 modules & auth views |
| **IndexedDB (`idb`)** | Offline POS transaction queue with UUID idempotency keys |
| **Recharts** | Interactive telemetry, revenue trends, and payment breakdown charts |
| **Lucide React** | Accessible enterprise iconography |
| **JsBarcode** | Thermal barcode label generation and printing |

---

## 🎨 Professional Supermarket Design System

- **Modern Supermarket Palette**:
  - Primary Brand Green: `#16A34A`
  - Dark Green Header / Accents: `#166534`
  - Fresh Lime Highlights: `#84CC16`
  - Accent Orange for CTAs & Promotions: `#F97316`
- **Light Mode**: Crisp white card surfaces (`#FFFFFF`), light canvas (`#F8FAFC`), rich green brand accents, and clean borders (`#E2E8F0`).
- **Dark Mode**: Sleek dark slate canvas (`#111827`), elevated dark card surfaces (`#1F2937`), high-contrast text (`#F9FAFB`), and vibrant green/orange indicators.
- **Instant Theme Toggle**: Interactive Sun/Moon button in the top navigation with instant switching, zero flicker, and persistent `localStorage` synchronization.
- **Dual-Language Translation**: Full instant toggle between Somali (🇸🇴) and English (🇬🇧) across all modules.
- **Global Search & Command Palette**: Trigger with <kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>Cmd</kbd> + <kbd>K</kbd> anywhere in the application.

---

## 📋 Comprehensive Main Navigation (All 20 Modules)

1. **Dashboard** (`/`): Real-time telemetry, today's sales, gross profit, inventory valuation, drawer status, near-expiry alerts, velocity products, and revenue trend chart.
2. **Point of Sale (POS)** (`/pos`): Dedicated, touchscreen-friendly checkout terminal. Barcode scanning (<kbd>F2</kbd>), category shortcuts, cart manipulation, customer loyalty attachment, coupons, split tender, and Cash / EVC Plus / eDahab / ZAAD mobile money support.
3. **Products & Master Catalog** (`/products`): Full CRUD, duplicate SKU/barcode validation, profit margin previews, barcode label printer (<kbd>jsbarcode</kbd>), and bulk CSV import/export.
4. **Categories & Brands** (`/categories`): Merchandise aisle departments and manufacturer brand lines with live product counters.
5. **Store Inventory** (`/inventory`): Live physical stock overview, valuation metrics, out-of-stock alerts, and automated AI reorder suggestions.
6. **Batches & Expiry Dates** (`/batches`): Lot tracking, shelf-life monitoring, strict **FEFO (First-Expired-First-Out)** allocation protocol, and condemned stock write-off disposal.
7. **Stock Counts & Adjustments** (`/stock-counts`): Manual adjustments with reason codes (Damaged, Theft, Expired, Found, Consumption) and full physical store cycle audits.
8. **Suppliers & Vendors** (`/suppliers`): Vendor directory, payment terms, contact details, and payables ledger.
9. **Purchase Orders & Receiving** (`/purchases`): PO creation, expected delivery tracking, partial receiving, and automatic stock updates upon delivery confirmation.
10. **Sales & Transactions** (`/sales`): Chronological checkout journal, payment breakdowns, reprint receipts, and authorized sale void workflows.
11. **Returns & Refunds** (`/returns`): Item-level returns with reason codes, condition inspection, and manager refund authorization before restocking.
12. **Customers & Loyalty** (`/customers`): Customer profiles, loyalty tiers (Standard, Silver, Gold, Platinum), points ledger, and reward redemption.
13. **Cashier Shifts** (`/shifts`): Cash float opening, mid-shift drops & pay-ins, blind drawer counts, shortage/overage variance calculation, and daily printable shift reports.
14. **Store Operating Expenses** (`/expenses`): Utility bills, generator diesel fuel, packaging supplies, staff costs, and operating expense ledger.
15. **Employees & Access Control** (`/employees`): Staff roster (Super Admin, Manager, Inventory Manager, Cashier, Accountant, Auditor) and RBAC permission matrix.
16. **Promotions & Coupons** (`/promotions`): Store discount campaigns, minimum spend thresholds, usage limits, and promotional vouchers.
17. **Reports & Analytics** (`/reports`): Daily, weekly, monthly, and yearly P&L statements, COGS, and **Net Operating Result Formula**: `(Sales Revenue - COGS) - Operating Expenses`.
18. **Store Notifications** (`/notifications`): Critical telemetry alerts for low stock, expiring lots, shift closing reviews, and refund requests.
19. **Activity Logs** (`/activity-logs`): Immutable audit trail recording user actors, security events, timestamps, and target records.
20. **Store Settings** (`/settings`): Single-supermarket profile, contact details, currency (`USD` / `SOS`), tax rules, and 58mm/80mm thermal receipt templates.

---

## 🔐 Authentication & Password Recovery Workflow

- **Staff Login** (`/login`): Secure portal with email & password, remember session, and convenient 1-click role switcher demo buttons.
- **Forgot Password** (`/forgot-password`): Staff email input with format validation, submission cooldown prevention, and generic security status messaging.
- **Reset Password** (`/reset-password`): Captures `?token=...` safely from query parameters, clears the token from the visible URL history, validates password complexity (min 8 chars, uppercase, number, matching confirm), and redirects to login upon success.

---

## 📶 Offline POS & PWA Architecture

When disconnected from the network:
1. The application shell and catalog remain fully usable.
2. Checkout transactions are saved into **IndexedDB** (`supermarket_pos_offline_db`) with unique UUID idempotency keys.
3. An **Offline Indicator** pill appears in the top navigation showing the count of queued transactions.
4. When internet connectivity returns, the background sync engine transmits queued transactions safely, reconciling stock changes without duplicate charges.
5. Pending transactions are clearly labeled as `pending` or `queued` and never falsely reported as verified bank payments.

---

## 🖨️ Thermal Receipt Printing

- **80 mm & 58 mm Toggle**: Select preferred thermal paper roll width in print preview dialog or store settings.
- **Browser Print Engine**: Clean `@media print` formatting ensures only the thermal receipt prints without browser header/footer margins.
- **Barcodes**: Integrated Code128 generation with price and item details for shelf labeling.

---

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── app/
│   ├── assets/
│   ├── components/
│   │   ├── common/           # Sidebar, Header, CommandPalette, ThermalReceiptModal, BarcodeGeneratorModal
│   │   └── ui/               # Button, Input, Select, Badge, Card, Dialog, Tabs, Switch, Toast, Skeleton
│   ├── layouts/              # AppLayout (collapsible sidebar + header + main outlet)
│   ├── pages/                # All 20 application pages + Auth (Login, ForgotPassword, ResetPassword)
│   ├── routes/               # React Router configuration
│   ├── services/             # Typed Axios API client & 16 distinct service modules + dataStore
│   ├── stores/               # Zustand state (authStore, themeStore, posCartStore, offlineStore)
│   ├── types/                # Comprehensive TypeScript interfaces & types
│   ├── utils/                # cn, formatters, idb, exportCsv
│   ├── index.css             # Tailwind v4 theme tokens & thermal print styles
│   └── main.tsx              # React DOM entrypoint
├── .env.example
├── package.json
└── vite.config.ts
```
