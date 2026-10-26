# Modern Warehouse Management System (WMS) - Architecture Documentation

Welcome to the comprehensive technical architecture and requirements specification for the **Modern Warehouse Management System (WMS)**.

This system is designed as an enterprise-grade, high-performance platform engineered with **React, TypeScript, Tailwind CSS, Node.js, Express, PostgreSQL, and Prisma**.

---

## Documentation Index

| Document | Focus & Highlights |
| :--- | :--- |
| **[01. Project Charter & Problem Statement](./01_PROJECT_CHARTER_AND_PROBLEM_STATEMENT.md)** | Executive summary, industry pain points, proposed solution, business objectives, and scope boundaries. |
| **[02. Requirements Specification (SRS)](./02_REQUIREMENTS_SPECIFICATION.md)** | Functional requirements across all 13 modules, Non-Functional Requirements (NFRs), and granular RBAC matrix. |
| **[03. System Architecture Document](./03_SYSTEM_ARCHITECTURE.md)** | High-level layered architecture, technology stack justification, security flow, concurrency control, and project monorepo structure. |
| **[04. Database Schema & ERD](./04_DATABASE_SCHEMA_AND_ERD.md)** | Mermaid Entity-Relationship Diagram and full production-ready Prisma schema with enums, indexes, and constraints. |
| **[05. REST API Specification Plan](./05_API_SPECIFICATION_PLAN.md)** | API standards, request/response envelopes, and complete endpoint catalogue for all modules. |
| **[06. Business Rules & Workflows](./06_BUSINESS_RULES_AND_WORKFLOWS.md)** | Golden balance equations, FIFO/FEFO allocation algorithms, Inbound PO-to-Putaway sequence, and Outbound Pick-Pack-Ship flow. |
| **[07. Risks, Assumptions & Mitigation](./07_RISKS_ASSUMPTIONS_AND_MITIGATION.md)** | Risk assessment matrix, concurrency race condition mitigation, barcode hardware assumptions, and Wi-Fi dead-zone handling. |
| **[08. Development Roadmap](./08_DEVELOPMENT_ROADMAP.md)** | Phased implementation schedule (Phase 0 Foundation to Phase 4 Analytics & Audit), Gantt chart, and Definition of Done. |

---

## Target Technology Stack Summary

```
+-----------------------------------------------------------------------------------+
| Frontend: React 18+ (TypeScript), Tailwind CSS, TanStack Query, Zustand, Lucide   |
+-----------------------------------------------------------------------------------+
| Backend:  Node.js v20 (LTS), Express.js, TypeScript, Zod, Argon2, Winston         |
+-----------------------------------------------------------------------------------+
| Database: PostgreSQL 16+, Prisma ORM v5, ACID Transactions, Row-Level Locking     |
+-----------------------------------------------------------------------------------+
| DevOps:   Docker, Docker Compose, Nginx Reverse Proxy, Automated Migration Engine  |
+-----------------------------------------------------------------------------------+
```

---

## 13 Core Modules Overview

1. **Authentication:** Secure JWT + HTTP-only refresh token rotation, RBAC permission middleware.
2. **Dashboard:** Real-time KPI summary, warehouse capacity utilization, order velocity, operational alerts.
3. **Products:** Master product catalog, SKU/barcode lookup, UOM, dimensions, weight, replenishment thresholds.
4. **Categories:** Hierarchical category tree, storage class inheritance.
5. **Suppliers:** Vendor registry, lead time tracking, supplier-specific SKUs and pricing.
6. **Warehouses:** Multi-facility support, operating hours, spatial metrics, inter-warehouse transfers.
7. **Locations:** 6-tier spatial hierarchy (`Warehouse` -> `Zone` -> `Aisle` -> `Rack` -> `Shelf` -> `Bin`), barcode generation, pick route sequencing.
8. **Inventory:** Triple-state balances (`On-Hand`, `Reserved`, `Available`), Batch/Lot and Expiry tracking, Serial numbers, reason-coded Stock Adjustments.
9. **Receiving:** Purchase Orders, Goods Receipt Note (GRN), inspection (accepted/rejected), Directed Putaway task generation.
10. **Orders:** Sales Orders lifecycle, FIFO & FEFO stock allocation engine with row-level concurrency protection.
11. **Dispatch:** Optimized pick list generation, scan-to-pick mobile flow, packing station carton check, carrier manifest and shipping dispatch.
12. **Reports:** Inventory valuation (FIFO/Average), stock movement ledger, aging analysis, fulfillment KPIs, CSV/Excel/PDF export.
13. **Audit Logs:** Immutable audit log stream recording actor, timestamp, entity diffs, and IP for complete compliance.
