# Single Supermarket Management System — Backend API

An enterprise-grade, secure, modular RESTful API and real-time backend engineered specifically for **a single supermarket operating at one physical location**. Built with **Node.js, Express.js, TypeScript, MongoDB, and Mongoose**.

> **Architecture Note**: This system strictly enforces single-store operations. There are no Branch models, branch comparison queries, branch selectors, or inter-branch transfer mechanisms. All stock, transactions, registers, and accounting belong exclusively to this single store.

---

## 1. Technology Stack

- **Runtime & Language**: Node.js (>=18) & TypeScript (Strict Mode)
- **Framework**: Express.js
- **Database & ODM**: MongoDB & Mongoose
- **Data Validation**: Zod schemas for body, query, and path parameters
- **Authentication**: JWT access tokens (15m) + secure rotating refresh tokens (7d) stored in HttpOnly cookies
- **Password Security**: bcrypt (12 rounds) with salt and cryptographic SHA-256 tokens
- **Security & Headers**: Helmet, CORS with credential handling, double-submit cookie CSRF protection
- **Rate Limiting**: Express-rate-limit (general + strict auth limiter)
- **Logging**: Winston structured logger with automated sensitive-data redaction (passwords, tokens, CVV, secrets)
- **Documentation**: OpenAPI 3.0 / Swagger UI at `/api/docs`
- **Real-Time Communication**: Socket.IO with JWT handshake authentication & role-based rooms
- **Testing**: Vitest + Supertest with isolated in-memory MongoDB environment

---

## 2. Directory Structure

```text
backend/
├── src/
│   ├── config/             # Environment validation (Zod), MongoDB connection, Winston logger
│   ├── models/             # 25 Mongoose models
│   ├── routes/             # Express routes grouped by business domain (/api/v1/...)
│   ├── controllers/        # Request handlers & HTTP response mappings
│   ├── services/           # Authoritative business logic, financial math, FEFO allocation
│   ├── middleware/         # Auth, RBAC permissions, CSRF, rate limiter, request logger, error handler
│   ├── validators/         # Zod schemas for all requests
│   ├── policies/           # Role-based access control (RBAC) permission definitions
│   ├── jobs/               # Background crons (expiration tracking, low stock alerts)
│   ├── sockets/            # Authenticated Socket.IO setup and role broadcasting
│   ├── utils/              # Crypto, JWT, Nodemailer, Barcode SVG, CSV import/export, API formatters
│   ├── types/              # Roles, permissions, common API interfaces, Express augmentation
│   ├── docs/               # OpenAPI 3.0 Swagger specification
│   ├── app.ts              # Express application factory
│   └── server.ts           # Server bootstrap and graceful shutdown handler
├── tests/                  # Automated integration and unit tests (Vitest)
│   ├── setup.ts            # MongoMemoryServer lifecycle hook
│   ├── auth.test.ts        # Login, refresh, CSRF, password recovery lifecycle
│   ├── products.test.ts    # Product CRUD, duplicate SKU/barcode checks, safe retention
│   ├── inventory.test.ts   # FEFO lot allocation, expiry prevention, counts & adjustments
│   ├── pos.test.ts         # Server recalculation, idempotency, stock deductions, voiding
│   └── purchase_return_shift.test.ts # PO receiving, returns, shifts, and P&L metrics
├── scripts/
│   └── seed.ts             # Initial admin, settings, categories, units, products, coupons
├── .env.example            # Documented environment template
├── package.json
└── tsconfig.json
```

---

## 3. Database Models (25 Models)

1. **User**: Employee accounts with roles, custom permissions, status (`active`, `inactive`, `suspended`), password hash, and reset token hash.
2. **Session / RefreshToken**: Cryptographic refresh token rotation, device metadata, TTL index, and instant revocation.
3. **StoreSettings**: Single store configuration record (supermarket name, address, tax rate, currency, receipts, thresholds, loyalty settings).
4. **Product**: Unique SKU, unique barcode, category, brand, unit, costPrice, sellingPrice, taxRate, minStockLevel, safe archive flag.
5. **Category**: Hierarchy tags for supermarket catalog organization.
6. **Brand**: Manufacturer and brand designations.
7. **Unit**: Metric and imperial measurement units with decimal precision control (e.g. `pcs` precision 0, `kg` precision 3).
8. **Supplier**: Vendor details, contact information, payment terms, and ledger balance.
9. **Customer**: CRM customer record with phone unique index, loyalty points ledger, and lifetime purchase metrics.
10. **InventoryLot**: Tracked batches with `batchNumber`, `expirationDate`, `remainingQuantity`, unit cost, supplier, and status (`active`, `depleted`, `expired`, `quarantined`).
11. **StockMovement**: Complete immutable ledger of stock additions and deductions (`SALE`, `PURCHASE_RECEIPT`, `SALE_RETURN`, `ADJUSTMENT`, `PHYSICAL_COUNT`, etc.).
12. **StockCount**: Physical inventory count sessions with system stock comparison, discrepancy value calculation, and manager approval.
13. **Sale**: Authoritative POS sales record with unique receipt number, snapshot item prices/costs, FEFO lot allocations, payments, change, and idempotency key.
14. **SaleReturn**: Customer returns with physical condition inspection (`resellable`, `damaged`, `expired`) and disposition (`restocked`, `quarantined`, `disposed`).
15. **Purchase**: Purchase orders with draft, approval, and partial receiving workflows (does **not** increase stock until received).
16. **PurchaseReturn**: Return of defective or expired merchandise back to suppliers.
17. **Payment**: Central payment ledger across sales, purchases, returns, and expenses (`CASH`, `CARD`, `EVC_PLUS`, `EDAHAB`, `ZAAD`, `BANK_TRANSFER`).
18. **CashierShift**: Register session tracking opening cash, sales cash, pay-ins, pay-outs, safe drops, counted closing cash, and discrepancies.
19. **CashMovement**: Individual cash movements within an active cashier shift (`PAY_IN`, `PAY_OUT`, `DROP`).
20. **Expense**: Operational expenditures (rent, utilities, maintenance, salaries) categorized with payment records.
21. **Promotion**: Automated store discount campaigns (percentage or fixed amount, start/end dates, order thresholds).
22. **Coupon**: Single-use or multi-use promo codes with customer scoping and usage limits.
23. **LoyaltyTransaction**: Immutable points ledger (`EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTED`).
24. **Notification**: Persisted alerts for low stock, expiring batches, refund approvals, and shifts targeted to specific roles.
25. **ActivityLog**: Immutable audit logs capturing actor, action, entity, entity ID, changes diff, IP, and timestamp.

---

## 4. Role-Based Access Control (RBAC)

The system defines 6 specialized roles with granular permission mappings:

| Role | Core Responsibilities |
| :--- | :--- |
| **Administrator** | Full access to all catalog, inventory, sales, financial, settings, and user management features. |
| **Manager** | Store operations, inventory adjustments, purchase approvals, physical counts, void/refund approvals, shift approvals. |
| **Inventory Manager** | Catalog management, stock movements, purchase receiving, physical inventory counts, and expiry management. |
| **Cashier** | POS checkout, opening/closing own shift, cash drawer pay-in/out, customer lookups. Voiding/refunding requires manager permission. |
| **Accountant** | Financial reports, P&L statements, expense recording, purchase order viewing, and cashier shift reconciliation. |
| **Auditor** | Read-only access across inventory ledger, sales, expenses, and immutable activity audit logs. |

---

## 5. Standard API Response Specification

All endpoints are mounted under `/api/v1`.

### Success Response (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "email", "message": "Valid email address required" }
    ]
  }
}
```

---

## 6. Secure Password Recovery Workflow

The system implements a cryptographically secure, email enumeration-resistant password recovery mechanism:

1. **Request Reset (`POST /api/v1/auth/forgot-password`)**:
   - User inputs registered email.
   - Endpoint applies strict rate limiting (max 15 requests per 15 min).
   - Generates a 32-byte cryptographically secure random token (`crypto.randomBytes(32)`).
   - Stores only the SHA-256 hash of the token in MongoDB alongside a 15-minute expiration timestamp (`Date.now() + 15 * 60 * 1000`).
   - Dispatches reset link (`${FRONTEND_URL}/reset-password?token=${rawToken}`) via Nodemailer SMTP.
   - **Constant-time generic response**: Returns `"If an account with that email exists, a password reset link has been sent."` regardless of whether the email exists, preventing user enumeration attacks.

2. **Execute Reset (`POST /api/v1/auth/reset-password`)**:
   - Accepts `token` and `newPassword`.
   - Hashes submitted token with SHA-256 and searches MongoDB for active matching token.
   - Validates password complexity (min 8 chars, uppercase, lowercase, number).
   - Hashes new password with `bcrypt` (12 salt rounds).
   - Clears `resetPasswordTokenHash` and `resetPasswordExpires` (strictly single-use).
   - **Session Invalidation**: Immediately revokes all active refresh tokens and sessions for this user across all devices.
   - Writes immutable security audit event to `ActivityLog`.

---

## 7. Financial Calculation & Profit Formulas

The reporting engine calculates true financial metrics strictly from database snapshots:

$$\text{Net Sales} = \text{Gross Sales} - \text{Discounts} - \text{Customer Refunds}$$
$$\text{Cost of Goods Sold (COGS)} = \sum (\text{Sold Line Item Quantity} \times \text{Historical Cost Price Snapshot})$$
$$\text{Gross Profit} = \text{Net Sales} - \text{COGS}$$
$$\text{Gross Profit Margin} = \left(\frac{\text{Gross Profit}}{\text{Net Sales}}\right) \times 100$$
$$\text{Net Operating Result} = \text{Gross Profit} - \text{Store Operating Expenses}$$
$$\text{Net Profit Margin} = \left(\frac{\text{Net Operating Result}}{\text{Net Sales}}\right) \times 100$$

> Revenue is never reported as profit. Historical cost prices are preserved per line item at checkout time, ensuring reporting accuracy regardless of future supplier price fluctuations.

---

## 8. POS Idempotency & Offline Synchronization

- **Idempotency**: POS clients send an `idempotencyKey` header or body parameter. If network retry or duplicate submission occurs, the backend detects the existing transaction and returns the original receipt and payment record without double-deducting inventory or duplicating payment entries.
- **Offline Reconciliation (`POST /api/v1/sales/reconcile-offline`)**: Accepts batches queued during network interruptions and evaluates each item authoritatively:
  - `CONFIRMED`: Stock, prices, and payments verified; sale processed.
  - `DUPLICATE`: Transaction was already synchronized.
  - `REQUIRES_MANUAL_REVIEW`: Product discontinued, price changed, or stock was depleted before sync.
  - `REJECTED`: Validation or payment error.

---

## 9. Quickstart & Setup Guide

### Prerequisites
- Node.js >= 18.0.0
- MongoDB instance (MongoDB Atlas or local replica set)

### 1. Installation
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `MONGODB_URI`, `JWT_SECRET`, and `COOKIE_SECRET` are configured.

If you use MongoDB Atlas, add the IP address of the machine running the backend
to **Atlas → Network Access → IP Access List**. The backend cannot start until
Atlas allows that address. For local development, also confirm that the MongoDB
URI, database user, and password are correct, and that your network or VPN does
not block outbound access to MongoDB.

### 3. Seed Database
Seeds default store settings, units, categories, sample products, suppliers, customer, promo coupon, and initial admin/staff accounts:
```bash
npm run seed
```
**Default Seed Credentials:**
- Administrator: `admin@supermarket.local` / `AdminPass123!`
- Manager: `manager@supermarket.local` / `Manager123!`
- Cashier: `cashier1@supermarket.local` / `Cashier123!`

### 4. Run Development Server
```bash
npm run dev
```
- API Base URL: `http://localhost:5000/api/v1`
- Swagger UI Documentation: `http://localhost:5000/api/docs`
- Health check: `http://localhost:5000/health`

### 5. Run Automated Tests
```bash
npm run test
```
Runs the Vitest suite covering authentication, password recovery, product catalog safe retention, FEFO batch allocation, POS checkout concurrency, cashier shifts, and financial reports.

### 6. Production Build
```bash
npm run build
npm start
```
Compiles TypeScript into `dist/` and runs the production server.
