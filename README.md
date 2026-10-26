# Enterprise Warehouse Management System (WMS)

A robust, full-stack Warehouse Management System (WMS) built with **React, TypeScript, Tailwind CSS, Node.js, Express, PostgreSQL, and Prisma ORM**.

Designed for multi-facility warehouse operations, featuring real-time triple-state inventory management ($ATP = OnHand - Reserved$), 6-level storage bin location hierarchies, purchase order receiving with quality control, customer order allocation and discrete picking/packing/dispatch, live visual telemetry dashboards, operational reports with CSV export, and an immutable security-redacted audit trail.

---

## Architecture & Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6
- **Backend:** Node.js v20, Express, TypeScript, Zod Schema Validation, bcrypt, JSON Web Tokens
- **Database & ORM:** PostgreSQL 16+, Prisma ORM v5 (with built-in zero-friction in-memory sync engine for local development)
- **Testing:** Automated test suites spanning all 6 business modules (**237 / 237 tests passed, 100%**)

---

## Key Modules & Features

1. **Authentication & RBAC:**
   - Cryptographic password hashing (`bcrypt`)
   - JWT sessions with token revocation
   - Strict role-based access control (`ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`)
2. **Master Data & Spatial Hierarchy:**
   - Products with unique SKU, barcodes, units of measure, and reorder thresholds
   - Category hierarchy with foreign key deletion protection
   - Suppliers with lead time and terms
   - Warehouses and 6-level storage locations (`Facility` $\rightarrow$ `Zone` $\rightarrow$ `Aisle` $\rightarrow$ `Rack` $\rightarrow$ `Shelf` $\rightarrow$ `Bin`)
3. **Core Inventory Engine:**
   - Triple-state inventory tracking: **On-Hand**, **Reserved**, and **Available-to-Promise**
   - Stock-in, stock-out, inter-location transfers, and audited adjustments
   - Immutable stock movement ledger
   - Low-stock and safety threshold alerts
   - FIFO/Average costing valuation
4. **Purchasing & Inbound Goods Receiving (GRN):**
   - Purchase order lifecycle with line item pricing
   - Multi-receipt and partial delivery support
   - Quality inspection: Accepted vs. Rejected quantities with mandatory reason logging
   - Over-receiving prevention guard (`422 Unprocessable Entity`)
   - Direct bin putaway location assignment
5. **Customer Orders & Outbound Fulfillment:**
   - Sales order creation with automatic stock reservation
   - Pick list generation with location-based picking tasks
   - Scan-to-pack verification
   - Outbound dispatch ledger with carrier and tracking number
   - Single-deduction inventory guarantee (prevents duplicate stock deductions)
   - Reservation release on cancellation
6. **Dashboard Telemetry & Analytics:**
   - Grounded in real database calculations (zero hardcoded numbers)
   - Live KPI cards, 7-day movement velocity chart, and order pipeline stage distribution
   - Multi-facility stock balance and valuation comparisons
7. **Operational Reports & Security Audit Trail:**
   - 8 comprehensive operational reports (Current Inventory, Stock Movements, Locations & Occupancy, Receiving, Orders, Dispatch, Low-Stock Shortfall, Financial Valuation)
   - Date range, product, warehouse, and keyword filters
   - One-click CSV export (`text/csv`)
   - Print-friendly stylesheets (`@media print`)
   - Security-redacted audit explorer (passwords and bcrypt hashes strictly filtered)

---

## Getting Started

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher (v20 LTS recommended)
- **npm:** v9.0.0 or higher
- **PostgreSQL:** Optional for local mode (in-memory synchronized engine included)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/<your-username>/warehouse-management-system.git
cd warehouse-management-system

# Install dependencies for root, client, and server
npm install
npm --prefix server install
npm --prefix client install
```

### 3. Environment Configuration
Create environment files from the provided templates:
```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

### 4. Running the Development Servers
```bash
# Start both server and client concurrently
npm run dev:all

# Or start individually:
npm run dev:server  # Backend runs on http://localhost:5000
npm run dev:client  # Frontend runs on http://localhost:5173
```

### 5. Running the Automated Tests
```bash
# Run all 237 automated tests across all test suites
npm test
```

---

## Seed Accounts

The development environment is pre-configured with the following user credentials:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@wms.local` | `Admin123!` | Unrestricted system-wide access, user creation, valuation reports, and audit logs |
| **Warehouse Manager** | `manager@wms.local` | `Manager123!` | Operational oversight, orders, purchasing, reports, and audit trail |
| **Warehouse Staff** | `staff@wms.local` | `Staff123!` | Receiving, picking, packing, inventory adjustments |

---

## Documentation

Detailed architectural documentation is available in the [`docs/`](./docs) directory:
- [01 Project Charter & Problem Statement](./docs/01_PROJECT_CHARTER_AND_PROBLEM_STATEMENT.md)
- [02 Requirements Specification](./docs/02_REQUIREMENTS_SPECIFICATION.md)
- [03 System Architecture](./docs/03_SYSTEM_ARCHITECTURE.md)
- [04 Database Schema & ERD](./docs/04_DATABASE_SCHEMA_AND_ERD.md)
- [05 API Specification Plan](./docs/05_API_SPECIFICATION_PLAN.md)
- [06 Business Rules & Workflows](./docs/06_BUSINESS_RULES_AND_WORKFLOWS.md)
- [07 Risks, Assumptions & Mitigation](./docs/07_RISKS_ASSUMPTIONS_AND_MITIGATION.md)
- [08 Development Roadmap](./docs/08_DEVELOPMENT_ROADMAP.md)

---

## License

MIT License.
