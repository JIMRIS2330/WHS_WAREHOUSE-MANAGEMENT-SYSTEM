# 05. REST API Specification & Endpoint Catalogue

## 1. REST API Design Standards

The Warehouse Management System exposes a predictable, resource-oriented RESTful API under the root prefix `/api/v1`.

### 1.1 Standard Request Headers
- `Content-Type: application/json`
- `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- `X-Warehouse-Id: <UUID>` (Optional header to establish operational facility context for warehouse staff)

### 1.2 Standard Success Response Envelope
All non-binary 2xx responses return a consistent envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "totalCount": 1420,
    "totalPages": 57
  },
  "timestamp": "2026-10-22T15:30:00.000Z"
}
```

### 1.3 Standard Error Response Envelope
All 4xx and 5xx errors conform to RFC 7807 problem details:
```json
{
  "success": false,
  "error": {
    "code": "STOCK_ALLOCATION_CONFLICT",
    "message": "Insufficient available unreserved stock for SKU: ELEC-0091. Available: 4, Requested: 10.",
    "details": [
      { "field": "quantityOrdered", "issue": "Requested quantity exceeds Available-To-Promise (ATP)" }
    ]
  },
  "timestamp": "2026-10-22T15:30:00.000Z"
}
```

---

## 2. API Endpoint Catalogue by Module

### Module 1: Authentication & User Management (`/api/v1/auth` & `/api/v1/users`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate with email/password; returns access token + sets HTTP-only refresh cookie | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate and issue new access token using valid refresh token cookie | Public |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh token and invalidate cookie | Authenticated |
| `GET` | `/api/v1/auth/me` | Fetch active user session profile and RBAC permissions | Authenticated |
| `POST` | `/api/v1/auth/forgot-password`| Trigger password reset email with temporary token | Public |
| `POST` | `/api/v1/auth/reset-password` | Set new password using verified token | Public |
| `GET` | `/api/v1/users` | List users with pagination and search | SUPER_ADMIN, WAREHOUSE_MANAGER |
| `POST` | `/api/v1/users` | Create new warehouse employee / user account | SUPER_ADMIN |
| `PUT` | `/api/v1/users/:id` | Update user roles, facility assignments, or active status | SUPER_ADMIN |

### Module 2: Executive & Operational Dashboard (`/api/v1/dashboard`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/metrics` | Real-time KPI summary (Total SKUs, Stock Value, Pending POs, Open Orders) | All Roles |
| `GET` | `/api/v1/dashboard/capacity` | Facility & zone volumetric/storage occupancy utilization | WAREHOUSE_MANAGER, ADMIN |
| `GET` | `/api/v1/dashboard/velocity` | 24-hour inbound vs outbound volume and fulfillment velocity | WAREHOUSE_MANAGER, ADMIN |
| `GET` | `/api/v1/dashboard/alerts` | Critical operational alerts (Expiring lots, stockouts, overdue POs) | All Roles |

### Module 3: Products Management (`/api/v1/products`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | Paginated product list with search, category, and storage filter | All Roles |
| `GET` | `/api/v1/products/:id` | Get single product master details | All Roles |
| `GET` | `/api/v1/products/scan/:barcode`| Rapid scanner lookup by barcode or SKU | All Roles |
| `POST` | `/api/v1/products` | Create new master product | ADMIN, WAREHOUSE_MANAGER |
| `PUT` | `/api/v1/products/:id` | Update product attributes, dimensions, or thresholds | ADMIN, WAREHOUSE_MANAGER |
| `DELETE`| `/api/v1/products/:id` | Deactivate/soft-delete product (prevented if stock exists) | ADMIN |
| `POST` | `/api/v1/products/bulk-import` | Upload CSV/Excel product catalog | ADMIN, WAREHOUSE_MANAGER |

### Module 4: Categories Management (`/api/v1/categories`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | Get full hierarchical category tree | All Roles |
| `POST` | `/api/v1/categories` | Create new category or sub-category | ADMIN, WAREHOUSE_MANAGER |
| `PUT` | `/api/v1/categories/:id` | Update category attributes | ADMIN, WAREHOUSE_MANAGER |
| `DELETE`| `/api/v1/categories/:id` | Delete category (restricted if products linked) | ADMIN |

### Module 5: Suppliers Management (`/api/v1/suppliers`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/suppliers` | List suppliers with search and pagination | All Roles |
| `GET` | `/api/v1/suppliers/:id` | Supplier profile and linked catalog items | All Roles |
| `POST` | `/api/v1/suppliers` | Register new supplier | ADMIN, WAREHOUSE_MANAGER |
| `PUT` | `/api/v1/suppliers/:id` | Update supplier details and lead times | ADMIN, WAREHOUSE_MANAGER |
| `POST` | `/api/v1/suppliers/:id/products`| Link products with supplier SKU and purchase pricing | ADMIN, WAREHOUSE_MANAGER |

### Module 6: Warehouses Management (`/api/v1/warehouses`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/warehouses` | List all warehouses | All Roles |
| `GET` | `/api/v1/warehouses/:id` | Warehouse details, zones count, and storage metrics | All Roles |
| `POST` | `/api/v1/warehouses` | Create new physical warehouse facility | SUPER_ADMIN |
| `PUT` | `/api/v1/warehouses/:id` | Update warehouse details | SUPER_ADMIN, WAREHOUSE_MANAGER |

### Module 7: Locations Hierarchy (`/api/v1/warehouses/:warehouseId/locations`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/warehouses/:warehouseId/zones` | List zones within facility | All Roles |
| `POST` | `/api/v1/warehouses/:warehouseId/zones` | Create new zone (Bulk, Pick Face, Staging) | ADMIN, WAREHOUSE_MANAGER |
| `GET` | `/api/v1/warehouses/:warehouseId/locations` | Paginated bin locations with aisle/rack/shelf filters | All Roles |
| `GET` | `/api/v1/locations/scan/:barcode` | Scan location barcode (returns contents & capacity) | All Roles |
| `POST` | `/api/v1/warehouses/:warehouseId/locations` | Create single or batch generate coordinate bins | ADMIN, WAREHOUSE_MANAGER |
| `PATCH`| `/api/v1/locations/:id/lock` | Lock/unlock bin for cycle count or quarantine | WAREHOUSE_MANAGER |

### Module 8: Inventory Management (`/api/v1/inventory`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory` | Query inventory balances by SKU, warehouse, location, batch | All Roles |
| `GET` | `/api/v1/inventory/low-stock` | Retrieve SKUs where Available <= Reorder Point | All Roles |
| `POST` | `/api/v1/inventory/adjust` | Record stock adjustment with mandatory reason code | INVENTORY_CONTROLLER, MANAGER |
| `POST` | `/api/v1/inventory/transfer` | Execute internal bin-to-bin or warehouse transfer | INVENTORY_CONTROLLER, OPERATORS |
| `GET` | `/api/v1/inventory/batches` | List batches with expiration dates and quarantine status | All Roles |
| `PATCH`| `/api/v1/inventory/batches/:id/quarantine` | Toggle quarantine lock on specific batch | INVENTORY_CONTROLLER, MANAGER |

### Module 9: Inbound Receiving & Putaway (`/api/v1/inbound`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inbound/purchase-orders` | List purchase orders with status filter | All Roles |
| `POST` | `/api/v1/inbound/purchase-orders` | Create new purchase order | ADMIN, WAREHOUSE_MANAGER |
| `POST` | `/api/v1/inbound/purchase-orders/:id/issue`| Issue PO to supplier | ADMIN, WAREHOUSE_MANAGER |
| `POST` | `/api/v1/inbound/receive` | Submit Goods Receipt (GRN) with accepted/rejected items | INBOUND_OPERATOR, MANAGER |
| `GET` | `/api/v1/inbound/putaway-tasks` | List pending directed putaway tasks | INBOUND_OPERATOR, MANAGER |
| `POST` | `/api/v1/inbound/putaway-tasks/:id/complete`| Confirm putaway scan at destination bin | INBOUND_OPERATOR, MANAGER |

### Module 10: Orders & Allocation (`/api/v1/orders`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orders` | List sales orders with status, date, customer filters | All Roles |
| `POST` | `/api/v1/orders` | Create / import customer sales order | ADMIN, WAREHOUSE_MANAGER |
| `GET` | `/api/v1/orders/:id` | Sales order details, lines, and allocation status | All Roles |
| `POST` | `/api/v1/orders/:id/allocate` | Trigger FEFO/FIFO stock allocation engine | WAREHOUSE_MANAGER, OUTBOUND |
| `POST` | `/api/v1/orders/:id/cancel` | Cancel order and release reserved stock allocations | ADMIN, WAREHOUSE_MANAGER |

### Module 11: Outbound Dispatch (`/api/v1/dispatch`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/dispatch/pick-lists/generate` | Generate wave or discrete pick lists from allocated orders | WAREHOUSE_MANAGER, OUTBOUND |
| `GET` | `/api/v1/dispatch/pick-lists/:id` | View pick list and sequential pick tasks | OUTBOUND_OPERATOR, MANAGER |
| `POST` | `/api/v1/dispatch/pick-tasks/:id/confirm`| Scanner confirmation of item pick at bin | OUTBOUND_OPERATOR |
| `POST` | `/api/v1/dispatch/pack` | Packing station carton packing verification | OUTBOUND_OPERATOR |
| `POST` | `/api/v1/dispatch/ship` | Generate carrier manifest, record tracking, dispatch order | OUTBOUND_OPERATOR, MANAGER |

### Module 12: Reporting & Analytics (`/api/v1/reports`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/inventory-valuation`| Valuation report (total cost & retail value by facility) | ADMIN, MANAGER, AUDITOR |
| `GET` | `/api/v1/reports/stock-movements` | Ledger of all receipts, transfers, picks, and adjustments | ADMIN, MANAGER, AUDITOR |
| `GET` | `/api/v1/reports/aging` | Stock aging analysis (0-30, 31-60, 61-90, 90+ days) | ADMIN, MANAGER, AUDITOR |
| `GET` | `/api/v1/reports/fulfillment-kpi` | Picker throughput, order cycle times, fulfillment rate | ADMIN, MANAGER, AUDITOR |
| `GET` | `/api/v1/reports/export/:reportType` | Stream report download as CSV or Excel (XLSX) | ADMIN, MANAGER, AUDITOR |

### Module 13: Audit Logs & Compliance (`/api/v1/audit`)
| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/audit` | Query immutable audit log with entity, actor, and date filters | SUPER_ADMIN, AUDITOR, MANAGER |
| `GET` | `/api/v1/audit/entity/:entity/:entityId`| Complete chronological history of a specific record | SUPER_ADMIN, AUDITOR, MANAGER |
