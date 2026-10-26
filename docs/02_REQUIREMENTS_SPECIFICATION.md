# 02. System Requirements Specification (SRS)

## 1. Introduction & User Roles

The Warehouse Management System (WMS) governs inventory control, inbound receiving, warehouse spatial hierarchy, outbound fulfillment, and regulatory compliance.

### 1.1 User Personas & Role-Based Access Control (RBAC) Matrix

The system provides 6 core personas with fine-grained permissions:

1. **Super Admin / System Administrator:** Full system configuration, tenant settings, user lifecycle, role management, audit inspection.
2. **Warehouse Operations Manager:** Multi-warehouse visibility, operational dashboards, workflow overrides, inventory adjustments, cycle count approvals, reports.
3. **Inventory Controller / Quality Specialist:** Stock levels, batch/lot management, quarantine locks, cycle counting, write-offs, reorder thresholds.
4. **Inbound / Receiving Operator:** PO lookup, ASN receiving, dock staging, discrepancy reporting, putaway task execution.
5. **Outbound / Picker & Packer:** Pick lists, wave picking, packing verification, weight checks, label printing, dispatch handoff.
6. **Auditor / Read-Only Analyst:** Read-only access to inventory logs, transaction history, performance KPIs, and compliance reports.

#### Detailed RBAC Permissions Matrix

| Module | Super Admin | Warehouse Manager | Inventory Controller | Inbound Operator | Outbound Operator | Auditor / Read-Only |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Authentication & Users** | Full (CRUD) | View Users | None | None | None | View Own Profile |
| **Dashboard** | Global View | Warehouse View | Stock View | Inbound View | Outbound View | Analytics View |
| **Products & Categories** | Full (CRUD) | Full (CRUD) | Full (CRUD) | View Only | View Only | View Only |
| **Suppliers** | Full (CRUD) | Full (CRUD) | View Only | View Only | None | View Only |
| **Warehouses & Locations** | Full (CRUD) | Manage Bins | View Only | View Only | View Only | View Only |
| **Inventory Movements** | Full (CRUD) | Approve Moves | Create / Execute | Transfer In | Transfer Out | View Only |
| **Receiving & Putaway** | Full (CRUD) | Full (CRUD) | QC Approvals | Receive & Put | None | View Only |
| **Orders & Allocation** | Full (CRUD) | Full (CRUD) | Allocate Stock | View Inbound | Pick & Pack | View Only |
| **Dispatch & Shipping** | Full (CRUD) | Full (CRUD) | View Only | None | Pack & Ship | View Only |
| **Reports & BI** | Full Export | Full Export | Stock Reports | Inbound Logs | Outbound Logs | View & Export |
| **Audit Logs** | View All | View Facility | View Stock Logs | View Own Logs | View Own Logs | Full View (Immutable) |

---

## 2. Functional Requirements by Module

### Module 1: Authentication & Identity Management
- **FR-AUTH-01:** Support secure authentication using email/password with Argon2/bcrypt password hashing.
- **FR-AUTH-02:** Issue short-lived JWT access tokens (15 minutes) and HTTP-only, secure, same-site refresh tokens (7 days) with token rotation.
- **FR-AUTH-03:** Enforce Role-Based Access Control (RBAC) via declarative Express middleware inspecting route permissions.
- **FR-AUTH-04:** Provide password reset workflows with cryptographically secure, time-limited tokens.
- **FR-AUTH-05:** Track failed login attempts and enforce rate limiting (e.g., 5 failed attempts = 15-minute lockout).

### Module 2: Executive & Operational Dashboard
- **FR-DASH-01:** Display real-time KPI tiles: Total Active SKUs, Total Stock on Hand, Stock Value, Pending Inbound Receipts, Orders in Progress, Out of Stock / Low Stock count.
- **FR-DASH-02:** Display Warehouse Capacity & Volumetric Utilization meters across zones and warehouses.
- **FR-DASH-03:** Render interactive activity charts: 24-hour inbound vs outbound volume, fulfillment velocity, top-picked SKUs.
- **FR-DASH-04:** Provide quick-action alerts: Expiring Lots (< 30/60/90 days), Quarantine Alerts, Overdue Purchase Orders, High-Priority Backorders.

### Module 3: Products Management
- **FR-PROD-01:** Support full CRUD for Master Products with mandatory SKU, Barcode/UPC, Name, Description, Unit of Measure (UOM: e.g., Each, Box, Pallet), Cost Price, and Selling Price.
- **FR-PROD-02:** Capture physical attributes: Dimensions (L x W x H in cm), Unit Weight (kg), Storage Class (Ambient, Cold Chain, Hazardous, Fragile).
- **FR-PROD-03:** Manage inventory thresholds: Minimum Stock Level, Maximum Stock Level, Reorder Point, and Safety Stock.
- **FR-PROD-04:** Support single-product and bulk CSV/Excel product catalog import/export.

### Module 4: Categories Management
- **FR-CAT-01:** Support multi-level hierarchical category trees (parent-child relationships).
- **FR-CAT-02:** Enable category-level default storage conditions and hazardous material flags inherited by child products.
- **FR-CAT-03:** Provide SKU generation prefixes based on category taxonomy (e.g., `ELEC-` for Electronics).

### Module 5: Suppliers Management
- **FR-SUP-01:** Maintain master supplier directory: Company Name, Supplier Code, Contact Person, Email, Phone, Physical Address, Tax ID, and Payment Terms.
- **FR-SUP-02:** Track supplier performance metrics: Average Lead Time (days), Fill Rate (%), On-Time In-Full (OTIF) score.
- **FR-SUP-03:** Link suppliers directly to assigned product catalog items with supplier-specific SKUs and agreed purchase prices.

### Module 6: Warehouses Management
- **FR-WH-01:** Manage multiple discrete physical facilities (Warehouses / Distribution Centers) with individual timezones, contact details, and physical addresses.
- **FR-WH-02:** Define facility operating hours, dock door schedules, and maximum structural capacity (sq meters and cubic meters).
- **FR-WH-03:** Support inter-warehouse inventory transfers with in-transit tracking and transfer orders.

### Module 7: Locations Hierarchy (Zones, Aisles, Racks, Shelves, Bins)
- **FR-LOC-01:** Structure warehouse space into a strict 6-tier hierarchy:
  `Warehouse` -> `Zone` -> `Aisle` -> `Rack` -> `Shelf` -> `Bin`.
- **FR-LOC-02:** Enforce unique canonical location barcodes (e.g., `WH1-Z01-A03-R02-S04-B01`).
- **FR-LOC-03:** Assign Zone Types: Bulk Storage, Pick Face / Fast Pick, Receiving / Staging, Packing / Shipping Dock, Quality Control (QC), Returns Quarantine.
- **FR-LOC-04:** Define Bin constraints: Maximum Weight capacity (kg), Maximum Volume (m³), and Pick Path sequence index for route optimization.

### Module 8: Inventory Management
- **FR-INV-01:** Maintain triple-state inventory balances per SKU per Bin:
  - `Quantity On-Hand` (Physical total)
  - `Quantity Reserved` (Allocated to active pick lists)
  - `Quantity Available` (`On-Hand` minus `Reserved`)
- **FR-INV-02:** Support Batch / Lot tracking with Batch Number, Manufacturing Date, and Expiration Date.
- **FR-INV-03:** Support Serial Number tracking for high-value / serialized items (each unit uniquely identified).
- **FR-INV-04:** Provide manual and cycle-count stock adjustments with mandatory Reason Codes (Damage, Shrinkage, Found, Expired, Recalibration) and manager approval threshold.
- **FR-INV-05:** Trigger automated Low Stock and Stockout webhook notifications when Available Stock <= Reorder Point.

### Module 9: Inbound Receiving & Putaway
- **FR-REC-01:** Create and manage Purchase Orders (POs) with status lifecycle: `DRAFT` -> `ISSUED` -> `PARTIALLY_RECEIVED` -> `RECEIVED` -> `CLOSED` -> `CANCELLED`.
- **FR-REC-02:** Perform receiving inspection against PO line items; capture received quantity, damaged quantity, lot numbers, and expiry dates.
- **FR-REC-03:** Support blind receiving and over-delivery restrictions (configurable overage allowance, e.g., max 5%).
- **FR-REC-04:** Generate Goods Receipt Notes (GRN) upon intake completion.
- **FR-REC-05:** Generate System-Directed Putaway Tasks: Recommend optimal destination bins based on SKU velocity (ABC analysis), storage class compatibility, and available bin volume.

### Module 10: Orders Management (Sales Orders & Allocation)
- **FR-ORD-01:** Ingest and manage Sales Orders with status lifecycle:
  `PENDING` -> `ALLOCATED` -> `PICKING` -> `PACKED` -> `DISPATCHED` -> `DELIVERED` -> `CANCELLED`.
- **FR-ORD-02:** Execute automated inventory reservation/allocation engine supporting:
  - **FEFO (First-Expired, First-Out)** for perishable/dated goods.
  - **FIFO (First-In, First-Out)** for standard goods.
- **FR-ORD-03:** Handle backorders and partial allocations gracefully without deadlocks.
- **FR-ORD-04:** Validate customer delivery address, shipping method, and order priority (Standard, Express, Urgent).

### Module 11: Outbound Dispatch (Pick, Pack, Ship)
- **FR-DISP-01:** Generate optimized Pick Lists ordered by bin Pick Sequence Index to minimize picker travel distance.
- **FR-DISP-02:** Support Discrete Order Picking and Batch / Wave Picking across multiple orders.
- **FR-DISP-03:** Packing station interface: Scan-to-verify items into shipping cartons, capture package gross weight and dimensions.
- **FR-DISP-04:** Generate Shipping Manifests, Packing Slips, and Carrier Barcode Labels.
- **FR-DISP-05:** Finalize Dispatch: Transition order status to `DISPATCHED`, record Carrier Name and Tracking Number, and decrement physical `Quantity On-Hand`.

### Module 12: Reporting & Analytics
- **FR-REP-01:** Inventory Valuation Report: FIFO/Average cost valuation by warehouse and category.
- **FR-REP-02:** Stock Movement History Report: Comprehensive audit trail of all receipts, transfers, picks, and adjustments.
- **FR-REP-03:** Inventory Aging & Slow-Moving Report: Identifies inventory dwelling > 90, 180, or 365 days.
- **FR-REP-04:** Warehouse Utilization Report: Volumetric and rack utilization percentages by zone.
- **FR-REP-05:** Order Fulfillment KPI Report: Average pick-to-ship cycle time, on-time shipment rate, picking error rate.
- **FR-REP-06:** Export all reports to CSV, Excel (XLSX), and PDF formats.

### Module 13: Audit Logs & Compliance
- **FR-AUD-01:** Maintain an append-only, immutable audit log table recording all state-mutating actions across the system.
- **FR-AUD-02:** Capture Actor User ID, Timestamp, IP Address, HTTP User Agent, Action Type (CREATE, UPDATE, DELETE, ADJUST, TRANSFER), Entity Name, Entity ID, and JSON Before/After Diffs.
- **FR-AUD-03:** Provide tamper-evident, search-indexed audit viewing UI with filters for date range, entity type, user, and action.

---

## 3. Non-Functional Requirements (NFR)

### 3.1 Performance & Responsiveness
- **NFR-PERF-01:** 95% of read API queries must respond within **< 150 ms** under normal load (p95).
- **NFR-PERF-02:** Inventory allocation and transaction updates must complete within **< 300 ms** under concurrent load.
- **NFR-PERF-03:** Frontend Initial Page Load (FCP) **< 1.2s**, Largest Contentful Paint (LCP) **< 2.0s** on standard 4G broadband.
- **NFR-PERF-04:** Barcode scan input processing latency **< 100 ms** from scan trigger to UI confirmation.

### 3.2 Scalability & Concurrency
- **NFR-SCAL-01:** Architecture must support horizontal scaling of stateless Express application servers behind a load balancer.
- **NFR-SCAL-02:** Database concurrency: Handle at least 250 concurrent active warehouse pickers/receivers without deadlocks or row-lock starvation.
- **NFR-SCAL-03:** Support minimum database volume of 1,000,000 SKUs, 10,000,000 stock ledger transactions, and 500,000 annual orders.

### 3.3 Security & Integrity
- **NFR-SEC-01:** Transport Layer Security: HTTPS (TLS 1.3) enforced for all client-server communication.
- **NFR-SEC-02:** SQL Injection Prevention: Strict parameterization via Prisma ORM; zero raw string interpolation.
- **NFR-SEC-03:** Cross-Site Scripting (XSS) & CSRF: Strict Content Security Policy (CSP), sanitized input, and SameSite HTTP-only cookies.
- **NFR-SEC-04:** Rate limiting on sensitive endpoints (auth, checkout, stock adjustment).
- **NFR-SEC-05:** Zero hardcoded secrets: All credentials, database URLs, and signing keys managed via environment variables and validated at startup using Zod.

### 3.4 Reliability, Availability & Fault Tolerance
- **NFR-REL-01:** System Availability: 99.9% uptime (maximum 8.76 hours unscheduled downtime per year).
- **NFR-REL-02:** Transactional Atomicity: All multi-table inventory modifications must execute within strict PostgreSQL transactions (`prisma.$transaction`) with `SERIALIZABLE` or `READ COMMITTED` with row-level locks (`SELECT ... FOR UPDATE`).
- **NFR-REL-03:** Automated database daily snapshots with Point-in-Time Recovery (PITR) enabling Recovery Point Objective (RPO) < 15 minutes and Recovery Time Objective (RTO) < 1 hour.

### 3.5 Maintainability & Code Quality
- **NFR-MAINT-01:** Strict TypeScript on both Frontend and Backend with `noImplicitAny` enabled.
- **NFR-MAINT-02:** Clean Architecture / Layered Domain-Driven Design: Separation of Controller, Service, Repository, and Data Model layers.
- **NFR-MAINT-03:** Comprehensive test coverage: Unit test coverage > 80% on core business logic (inventory balance calculation, allocation algorithms, putaway routing).
