# 07. Risks, Assumptions, & Mitigation Strategies

## 1. Architectural & Technical Assumptions

1. **Hardware & Scanning Interface:**
   - Physical warehouse terminals (Honeywell, Zebra, or standard rugged Android devices) operate barcode scanners in **Keyboard Wedge Mode** (emulating rapid keyboard keystrokes followed by an `Enter` event).
   - Packing stations are equipped with desktop monitors, USB barcode scanners, and direct thermal label printers (Zebra ZPL / PDF printing).

2. **Network Infrastructure:**
   - Warehouse facilities provide industrial Wi-Fi (802.11ac/ax) coverage across active aisles, dock doors, and packing stations.
   - For temporary network dead-zones between high metallic pallet racks, the client SPA buffers user scan inputs and displays clear reconnection alerts.

3. **Data Integrity & Initial Migration:**
   - Client will conduct a mandatory physical wall-to-wall cycle count prior to cutover to establish verified opening balances.
   - All master products will have unique, scannable UPC/EAN or internal SKU barcodes prior to deployment.

---

## 2. Technical & Operational Risk Assessment Matrix

| # | Risk Description | Category | Likelihood | Impact | Severity | Mitigation Strategy |
| :- | :--- | :--- | :---: | :---: | :---: | :--- |
| **R1** | **Concurrent Allocation Race Condition (Double Selling)** | Technical | High | Critical | **HIGH** | Use PostgreSQL pessimistic row-level locking (`SELECT ... FOR UPDATE`) inside atomic Prisma `$transaction` blocks during order stock allocation. |
| **R2** | **Aisle Wi-Fi Dead Zones & Signal Dropout** | Infrastructure | High | High | **HIGH** | Responsive offline-resilient UI state using TanStack Query cache. Visual banner alerting the operator if connection drops, with retry queues for non-conflicting scans. |
| **R3** | **Database Row-Lock Contention on Fast-Mover SKUs** | Performance | Medium | High | **HIGH** | De-normalize stock reservation queues or distribute popular SKUs across multiple pick-face bins to prevent serial lock waiting on a single bin row. |
| **R4** | **Uncontrolled Audit Log Table Growth** | Database | High | Medium | **MEDIUM**| Implement PostgreSQL time-based table partitioning (e.g. monthly partitions for `AuditLog` and `StockMovement`) and automated archive to cold storage after 12 months. |
| **R5** | **Barcode Scanning Input Latency / Field Misalignment** | UX / Terminal | Medium | High | **HIGH** | Global keyboard event listener on mobile scanner layouts that automatically captures rapid barcode streams (< 50ms interval) regardless of which input currently has focus. |
| **R6** | **Operator Bypassing Scan Verification** | Operational | High | High | **HIGH** | Enforce zero-bypass policy in software: The "Confirm Pick" button is disabled until the exact matching location and SKU barcodes are scanned. |
| **R7** | **Inaccurate Initial Opening Balance Migration** | Data / Cutover | High | Critical | **HIGH** | Develop automated CSV import validation scripts with dry-run verification mode, location occupancy checking, and mandatory supervisor sign-off before committing. |
| **R8** | **Cascading Record Deletions Corrupting Ledger** | Architectural | Low | Critical | **HIGH** | Enforce Prisma `onDelete: Restrict` on critical foreign keys (Products, Locations, InventoryItems, Batches). Restrict deletion; allow only status archiving (`isActive: false`). |

---

## 3. Deep-Dive Mitigation Architectures

### 3.1 Mitigating Concurrent Allocation Race Conditions
When multiple e-commerce orders or large wholesale sales orders arrive simultaneously for the same high-demand product, concurrent requests could read the same available quantity and allocate beyond actual physical stock.

```
Request A (Order 101, Qty: 5) ---\
                                  +--> [PostgreSQL Row Lock: SELECT ... FOR UPDATE]
Request B (Order 102, Qty: 8) ---/
                                       |
                   Order 101 secures lock -> Reserves 5 units -> Commits & Releases Lock
                                       |
                   Order 102 acquires lock -> Sees updated available stock -> Reserves or Backorders
```

**Implementation Pattern:**
1. Transactions acquire exclusive locks on candidate `InventoryItem` records.
2. Orders are evaluated in timestamp order.
3. If unreserved stock is insufficient, the system creates a partial allocation and marks the remaining quantity as backordered, without failing the entire transaction.

### 3.2 High-Throughput Barcode Scanning Engine
Warehouse pickers cannot wait for slow network roundtrips between scanning a bin and scanning a product.
- **Client-Side Optimistic Parsing:** When a pick list is downloaded, all target location barcodes, product barcodes, and quantities are cached locally in the client memory.
- **Immediate Audio-Visual Validation:** The client matches scanned barcodes locally against cached expectations in `< 15ms`, playing an immediate audio feedback chime before the network mutation call is dispatched in the background.

### 3.3 Audit Ledger Scalability & Maintenance
With hundreds of thousands of stock movements per month, the `AuditLog` table will quickly grow into tens of millions of rows.
- **Strategy:** Partitioning by range on `createdAt` (yearly/monthly).
- **Indexing:** Dedicated B-Tree indexes on `(entity, entityId)` and `(createdAt DESC)` ensure lookups for single products or orders remain sub-second regardless of total table size.
