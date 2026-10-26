# 01. Project Charter & Problem Statement

## 1. Executive Summary
The **Modern Warehouse Management System (WMS)** is an enterprise-grade, high-performance web platform designed to streamline, track, and optimize end-to-end warehouse and supply chain operations. Built on a modern full-stack TypeScript foundation (React, Node.js, Express, PostgreSQL, Prisma, Tailwind CSS), the system manages physical inventory across multiple facilities from the moment goods arrive from suppliers to when customer orders are picked, packed, and dispatched.

---

## 2. Problem Statement

Modern distribution centers, 3PL facilities, and manufacturing warehouses face acute operational inefficiencies when relying on paper-based workflows, disconnected spreadsheets, or legacy monolithic enterprise resource planning (ERP) add-ons:

1. **Inventory Inaccuracy & Phantom Stock:**
   - Discrepancies between physical inventory and ledger records result in stockouts, overstocking, and cancelled customer orders.
   - Lack of real-time visibility into bin-level locations leads to excessive search times and lost inventory.

2. **Suboptimal Inbound & Putaway Workflows:**
   - Inbound receiving bottlenecks occur when goods arrival cannot be quickly reconciled against Purchase Orders (POs) or Advance Shipping Notices (ASNs).
   - Inefficient putaway logic places high-velocity SKUs in deep warehouse recesses, increasing retrieval labor costs.

3. **Picking Inefficiencies & Dispatch Delays:**
   - Unoptimized picking routes result in pickers walking thousands of unnecessary steps daily.
   - Manual order allocation fails to strictly enforce FIFO (First-In, First-Out) or FEFO (First-Expired, First-Out), leading to perishable spoilage and expired stock write-offs.

4. **Multi-Facility & Multi-Zone Blind Spots:**
   - Organizations operating multiple warehouses struggle to balance stock between central distribution hubs and satellite fulfillment centers.
   - Lack of granular location hierarchy (Warehouse -> Zone -> Aisle -> Rack -> Shelf -> Bin) limits spatial capacity utilization.

5. **Lack of Auditability & Compliance:**
   - Inability to trace who moved, adjusted, or dispatched specific lots/serials creates compliance exposure during audits or product recalls.
   - Disorganized stock adjustment reasons prevent root-cause analysis for shrinkage and damage.

---

## 3. Proposed Solution

The proposed WMS is an agile, modular, role-based platform engineered to deliver end-to-end operational control and sub-second traceability.

```
       +-----------------------------------------------------------+
       |                  Enterprise WMS Solution                  |
       +-----------------------------------------------------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
       v                             v                             v
+------------------+         +------------------+         +------------------+
| Inbound Control  |         | Inventory & Hub  |         | Outbound Engine  |
| - PO Matching    |         | - 6-Level Space  |         | - Wave / Batch   |
| - ASN Processing |         | - Batch / Expiry |         | - Pick / Pack    |
| - QC Inspection  |         | - FEFO / FIFO    |         | - Shipping Label |
| - Directed Put   |         | - Real-time Move |         | - Dispatch Docs  |
+------------------+         +------------------+         +------------------+
       |                             |                             |
       +-----------------------------+-----------------------------+
                                     |
                                     v
                  +-------------------------------------+
                  | Real-Time Visibility & Governance   |
                  | - Interactive Analytics Dashboard   |
                  | - Immutable Audit Log Stream        |
                  | - Automated Reorder & Low-Stock     |
                  +-------------------------------------+
```

### Key Solution Pillars:
1. **Precision Inventory Control:**
   - Strict dual-state quantity model: `Quantity On-Hand`, `Allocated / Reserved`, and `Available for Promise (ATP)`.
   - Native lot/batch and serial number tracking with expiration date alerts and automatic FEFO quarantine locks.

2. **Hierarchical Spatial Engine:**
   - Granular 6-tier location schema: `Warehouse` -> `Zone` -> `Aisle` -> `Rack` -> `Shelf` -> `Bin`.
   - Dimension, volume, and weight constraint validation to prevent bin overloading and optimize space utilization.

3. **Digitized Directed Workflows:**
   - **Inbound:** Purchase Order creation -> Advance Shipping Notice (ASN) -> Blind/Assisted Receiving -> Quality Check -> Staging -> Directed Putaway.
   - **Outbound:** Sales Order -> Stock Allocation -> Wave/Batch Picking -> Packing Verification -> Shipping Label & Manifest Generation -> Dispatch.

4. **Full Accountability & Zero-Trust Audit Trail:**
   - Every stock movement (adjustment, transfer, pick, receive, scrap) is logged with immutable timestamps, user IDs, before/after balances, and mandatory reason codes.

---

## 4. Business Objectives & Success Metrics

| Strategic Metric | Current Baseline (Industry Average) | Target Post-WMS Implementation | Measurement Timeline |
| :--- | :--- | :--- | :--- |
| **Inventory Accuracy Rate** | ~85% - 90% | **99.5%+** | Within 60 days of go-live |
| **Order Picking Cycle Time** | 18 - 25 minutes/order | **< 7 minutes/order** | 30 days post-wave optimization |
| **Dock-to-Stock Time** | 24 - 48 hours | **< 3 hours** | Immediate with digital receiving |
| **Order Fulfillment Accuracy** | ~92% | **99.8%** | 30 days post-packing scan check |
| **Carrying Cost Reductions** | Standard shrinkage 2-3% | **< 0.4%** | Annualized audit |

---

## 5. Scope & Boundary Matrix

### In-Scope:
- Multi-warehouse, multi-zone, and bin-level location management.
- Product catalog with SKU, barcode/UPC, dimensions, weight, and categories.
- Supplier management, purchase orders, receiving, and putaway logic.
- Sales order intake, inventory allocation, pick-list generation, packing, and dispatch.
- Real-time stock visibility with lot/batch tracking and expiration handling.
- Role-Based Access Control (RBAC) with granular permissions.
- Operational dashboards and reporting (turnover, velocity, aging, capacity).
- System-wide audit logging for all transactional modifications.

### Out-of-Scope (Deferred to Post-V1 Enhancements):
- Direct hardware driver orchestration for automated storage and retrieval systems (ASRS) and autonomous mobile robots (AMRs).
- Dynamic freight rate carrier shopping APIs (initial launch provides generic carrier manifest & tracking links).
- Direct billing and invoicing engine (WMS exposes webhooks and sync APIs for external ERP/accounting systems).
