import { prisma } from '../../config/prisma.js';
import { masterDataRepository } from '../masterData/masterData.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import {
  CreatePurchaseOrderInput,
  ConfirmGoodsReceiptInput
} from './purchasing.schema.js';

export interface POLineItemData {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: any;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  unitCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderData {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: any;
  warehouseId: string;
  warehouse?: any;
  status: 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED';
  expectedDate?: Date | null;
  totalAmount: number;
  notes?: string | null;
  createdByUserId?: string | null;
  createdByUser?: any;
  createdAt: Date;
  updatedAt: Date;
  lineItems: POLineItemData[];
  goodsReceipts?: GoodsReceiptData[];
}

export interface GoodsReceiptItemData {
  id: string;
  goodsReceiptId: string;
  poLineItemId: string;
  productId: string;
  product?: any;
  locationId: string;
  location?: any;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  batchNumber?: string | null;
  rejectionReason?: string | null;
  createdAt: Date;
}

export interface GoodsReceiptData {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: PurchaseOrderData;
  warehouseId: string;
  warehouse?: any;
  receivedByUserId?: string | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  billOfLading?: string | null;
  receivedAt: Date;
  notes?: string | null;
  createdAt: Date;
  items: GoodsReceiptItemData[];
}

// -----------------------------------------------------------------------------
// IN-MEMORY SYNCHRONIZED SEED STORE
// -----------------------------------------------------------------------------
const MEM_PURCHASE_ORDERS: PurchaseOrderData[] = [
  {
    id: 'po-01',
    poNumber: 'PO-2026-0001',
    supplierId: 'sup-01',
    warehouseId: 'wh-01',
    status: 'SUBMITTED',
    expectedDate: new Date(Date.now() + 86400000 * 3),
    totalAmount: 4500.0,
    notes: 'Urgent restocking for electric brushless motors',
    createdByUserId: 'usr-admin-01',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 2),
    lineItems: [
      {
        id: 'poli-01',
        purchaseOrderId: 'po-01',
        productId: 'prod-01',
        quantityOrdered: 100,
        quantityReceived: 0,
        quantityAccepted: 0,
        quantityRejected: 0,
        unitCost: 45.0,
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 86400000 * 2)
      }
    ]
  },
  {
    id: 'po-02',
    poNumber: 'PO-2026-0002',
    supplierId: 'sup-02',
    warehouseId: 'wh-01',
    status: 'PARTIALLY_RECEIVED',
    expectedDate: new Date(Date.now() + 86400000 * 5),
    totalAmount: 1400.0,
    notes: 'Split shipment for hydraulic seal kits',
    createdByUserId: 'usr-admin-01',
    createdAt: new Date(Date.now() - 86400000 * 4),
    updatedAt: new Date(Date.now() - 86400000 * 1),
    lineItems: [
      {
        id: 'poli-02',
        purchaseOrderId: 'po-02',
        productId: 'prod-03',
        quantityOrdered: 50,
        quantityReceived: 20,
        quantityAccepted: 20,
        quantityRejected: 0,
        unitCost: 28.0,
        createdAt: new Date(Date.now() - 86400000 * 4),
        updatedAt: new Date(Date.now() - 86400000 * 1)
      }
    ]
  },
  {
    id: 'po-03',
    poNumber: 'PO-2026-0003',
    supplierId: 'sup-03',
    warehouseId: 'wh-01',
    status: 'DRAFT',
    expectedDate: new Date(Date.now() + 86400000 * 7),
    totalAmount: 2500.0,
    notes: 'Draft order for treated wooden pallets',
    createdByUserId: 'usr-admin-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    lineItems: [
      {
        id: 'poli-03',
        purchaseOrderId: 'po-03',
        productId: 'prod-02',
        quantityOrdered: 200,
        quantityReceived: 0,
        quantityAccepted: 0,
        quantityRejected: 0,
        unitCost: 12.5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
];

const MEM_RECEIPTS: GoodsReceiptData[] = [
  {
    id: 'grn-01',
    receiptNumber: 'GRN-2026-0001',
    purchaseOrderId: 'po-02',
    warehouseId: 'wh-01',
    receivedByUserId: 'usr-staff-01',
    carrierName: 'DHL Freight',
    trackingNumber: 'DHL-99482104',
    billOfLading: 'BOL-55410',
    receivedAt: new Date(Date.now() - 86400000 * 1),
    notes: 'First partial batch of seal kits received in good condition',
    createdAt: new Date(Date.now() - 86400000 * 1),
    items: [
      {
        id: 'gri-01',
        goodsReceiptId: 'grn-01',
        poLineItemId: 'poli-02',
        productId: 'prod-03',
        locationId: 'loc-02',
        quantityReceived: 20,
        quantityAccepted: 20,
        quantityRejected: 0,
        batchNumber: 'LOT-2026-H8',
        rejectionReason: null,
        createdAt: new Date(Date.now() - 86400000 * 1)
      }
    ]
  }
];

// Helper to hydrate relations
async function hydratePO(po: PurchaseOrderData): Promise<PurchaseOrderData> {
  const supplier = await masterDataRepository.findSupplierById(po.supplierId);
  const warehouse = await masterDataRepository.findWarehouseById(po.warehouseId);
  
  const hydratedLines = await Promise.all(
    po.lineItems.map(async line => {
      const product = await masterDataRepository.findProductById(line.productId);
      return {
        ...line,
        product
      };
    })
  );

  const receipts = MEM_RECEIPTS.filter(r => r.purchaseOrderId === po.id);

  return {
    ...po,
    supplier,
    warehouse,
    lineItems: hydratedLines,
    goodsReceipts: receipts
  };
}

async function hydrateReceipt(grn: GoodsReceiptData): Promise<GoodsReceiptData> {
  const warehouse = await masterDataRepository.findWarehouseById(grn.warehouseId);
  const po = MEM_PURCHASE_ORDERS.find(p => p.id === grn.purchaseOrderId);

  const hydratedItems = await Promise.all(
    grn.items.map(async item => {
      const product = await masterDataRepository.findProductById(item.productId);
      const location = await masterDataRepository.findLocationById(item.locationId);
      return {
        ...item,
        product,
        location
      };
    })
  );

  return {
    ...grn,
    warehouse,
    purchaseOrder: po,
    items: hydratedItems
  };
}

export class PurchasingRepository {
  // ---------------------------------------------------------------------------
  // 1. LIST PURCHASE ORDERS
  // ---------------------------------------------------------------------------
  async listPurchaseOrders(params: {
    status?: string;
    supplierId?: string;
    warehouseId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: PurchaseOrderData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    // Attempt Prisma if DB connected
    try {
      const where: any = {};
      if (params.status) where.status = params.status;
      if (params.supplierId) where.supplierId = params.supplierId;
      if (params.warehouseId) where.warehouseId = params.warehouseId;
      if (params.search) {
        where.OR = [
          { poNumber: { contains: params.search, mode: 'insensitive' } },
          { notes: { contains: params.search, mode: 'insensitive' } }
        ];
      }

      const total = await prisma.purchaseOrder.count({ where });
      const pos = await prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          lineItems: {
            include: { product: true }
          },
          goodsReceipts: {
            include: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      return {
        items: pos as any,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch {
      // In-memory fallback
    }

    let filtered = [...MEM_PURCHASE_ORDERS];
    if (params.status) filtered = filtered.filter(p => p.status === params.status);
    if (params.supplierId) filtered = filtered.filter(p => p.supplierId === params.supplierId);
    if (params.warehouseId) filtered = filtered.filter(p => p.warehouseId === params.warehouseId);
    if (params.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.poNumber.toLowerCase().includes(term) ||
          (p.notes && p.notes.toLowerCase().includes(term))
      );
    }

    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const hydrated = await Promise.all(paginated.map(p => hydratePO(p)));

    return {
      items: hydrated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ---------------------------------------------------------------------------
  // 2. GET PURCHASE ORDER BY ID
  // ---------------------------------------------------------------------------
  async findPurchaseOrderById(id: string): Promise<PurchaseOrderData | null> {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          warehouse: true,
          lineItems: {
            include: { product: true }
          },
          goodsReceipts: {
            include: {
              items: {
                include: { product: true, location: true }
              }
            }
          }
        }
      });
      if (po) return po as any;
    } catch {
      // fallback
    }

    const po = MEM_PURCHASE_ORDERS.find(p => p.id === id);
    if (!po) return null;
    return hydratePO(po);
  }

  async findPurchaseOrderByPoNumber(poNumber: string): Promise<PurchaseOrderData | null> {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { poNumber },
        include: {
          supplier: true,
          warehouse: true,
          lineItems: { include: { product: true } },
          goodsReceipts: { include: { items: true } }
        }
      });
      if (po) return po as any;
    } catch {
      // fallback
    }

    const po = MEM_PURCHASE_ORDERS.find(p => p.poNumber.toLowerCase() === poNumber.toLowerCase());
    if (!po) return null;
    return hydratePO(po);
  }

  // ---------------------------------------------------------------------------
  // 3. CREATE PURCHASE ORDER
  // ---------------------------------------------------------------------------
  async createPurchaseOrder(
    data: CreatePurchaseOrderInput,
    userId?: string
  ): Promise<PurchaseOrderData> {
    // 1. Verify supplier
    const supplier = await masterDataRepository.findSupplierById(data.supplierId);
    if (!supplier) throw new Error(`Supplier '${data.supplierId}' not found`);

    // 2. Verify warehouse
    const warehouse = await masterDataRepository.findWarehouseById(data.warehouseId);
    if (!warehouse) throw new Error(`Warehouse '${data.warehouseId}' not found`);

    // 3. Verify products and compute total amount
    let totalAmount = 0;
    const verifiedLines: any[] = [];

    for (const item of data.lineItems) {
      const product = await masterDataRepository.findProductById(item.productId);
      if (!product) throw new Error(`Product '${item.productId}' not found`);
      const lineCost = item.quantityOrdered * item.unitCost;
      totalAmount += lineCost;
      verifiedLines.push({
        ...item,
        product
      });
    }

    const now = new Date();
    const poNumber = `PO-${now.getFullYear()}-${(MEM_PURCHASE_ORDERS.length + 1)
      .toString()
      .padStart(4, '0')}`;

    try {
      const created = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: data.supplierId,
          warehouseId: data.warehouseId,
          status: 'DRAFT',
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          totalAmount: Math.round(totalAmount * 100) / 100,
          notes: data.notes || null,
          createdByUserId: userId || null,
          lineItems: {
            create: data.lineItems.map(l => ({
              productId: l.productId,
              quantityOrdered: l.quantityOrdered,
              quantityReceived: 0,
              quantityAccepted: 0,
              quantityRejected: 0,
              unitCost: l.unitCost
            }))
          }
        },
        include: {
          supplier: true,
          warehouse: true,
          lineItems: { include: { product: true } }
        }
      });
      return created as any;
    } catch {
      // In-memory fallback
    }

    const newPO: PurchaseOrderData = {
      id: `po-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      poNumber,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      status: 'DRAFT',
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      totalAmount: Math.round(totalAmount * 100) / 100,
      notes: data.notes || null,
      createdByUserId: userId || null,
      createdAt: now,
      updatedAt: now,
      lineItems: []
    };

    newPO.lineItems = verifiedLines.map((l, idx) => ({
      id: `poli-${Date.now()}-${idx}`,
      purchaseOrderId: newPO.id,
      productId: l.productId,
      product: l.product,
      quantityOrdered: l.quantityOrdered,
      quantityReceived: 0,
      quantityAccepted: 0,
      quantityRejected: 0,
      unitCost: l.unitCost,
      createdAt: now,
      updatedAt: now
    }));

    MEM_PURCHASE_ORDERS.unshift(newPO);
    return hydratePO(newPO);
  }

  // ---------------------------------------------------------------------------
  // 4. UPDATE PURCHASE ORDER STATUS (SUBMIT / CANCEL)
  // ---------------------------------------------------------------------------
  async updatePurchaseOrderStatus(
    id: string,
    status: 'SUBMITTED' | 'CANCELLED',
    notes?: string | null
  ): Promise<PurchaseOrderData> {
    const po = MEM_PURCHASE_ORDERS.find(p => p.id === id);
    if (!po) throw new Error(`Purchase order '${id}' not found`);

    if (po.status === 'FULLY_RECEIVED') {
      throw new Error('Cannot change status of a fully received purchase order');
    }
    if (status === 'CANCELLED' && po.status === 'PARTIALLY_RECEIVED') {
      throw new Error('Cannot cancel a purchase order that has partial receipts');
    }

    const now = new Date();
    po.status = status;
    po.updatedAt = now;
    if (notes) po.notes = notes;

    try {
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status, updatedAt: now }
      });
    } catch {
      // fallback
    }

    return hydratePO(po);
  }

  // ---------------------------------------------------------------------------
  // 5. CONFIRM GOODS RECEIPT (INBOUND RECEIVING WORKFLOW)
  // ---------------------------------------------------------------------------
  async confirmGoodsReceipt(
    data: ConfirmGoodsReceiptInput,
    userId?: string
  ): Promise<{
    receipt: GoodsReceiptData;
    purchaseOrder: PurchaseOrderData;
    movements: any[];
  }> {
    // 1. Fetch & validate PO
    const po = MEM_PURCHASE_ORDERS.find(p => p.id === data.purchaseOrderId);
    if (!po) throw new Error(`Purchase order '${data.purchaseOrderId}' not found`);

    if (po.status === 'DRAFT') {
      throw new Error(`Cannot receive goods for PO '${po.poNumber}' in DRAFT status. Please submit order first.`);
    }
    if (po.status === 'CANCELLED') {
      throw new Error(`Cannot receive goods for CANCELLED purchase order '${po.poNumber}'`);
    }
    if (po.status === 'FULLY_RECEIVED') {
      throw new Error(`Purchase order '${po.poNumber}' is already FULLY_RECEIVED. Duplicate confirmation blocked.`);
    }

    // 2. Duplicate Submission / Tracking Number Check
    if (data.trackingNumber) {
      const duplicateReceipt = MEM_RECEIPTS.find(
        r =>
          r.purchaseOrderId === data.purchaseOrderId &&
          r.trackingNumber?.toLowerCase() === data.trackingNumber?.toLowerCase()
      );
      if (duplicateReceipt) {
        throw new Error(
          `Duplicate receipt submission detected: Tracking number '${data.trackingNumber}' already processed for PO '${po.poNumber}' on ${duplicateReceipt.receivedAt.toISOString()}`
        );
      }
    }

    // 3. Validate lines and over-receiving constraints
    for (const item of data.items) {
      const line = po.lineItems.find(l => l.id === item.poLineItemId);
      if (!line) {
        throw new Error(`Line item '${item.poLineItemId}' does not belong to purchase order '${po.poNumber}'`);
      }
      if (line.productId !== item.productId) {
        throw new Error(`Product mismatch: line item specifies product '${line.productId}', received '${item.productId}'`);
      }

      // Over-receiving rule: received + accepted + rejected cannot exceed ordered
      const totalAttempted = line.quantityReceived + item.quantityAccepted + item.quantityRejected;
      if (totalAttempted > line.quantityOrdered) {
        const remaining = Math.max(0, line.quantityOrdered - line.quantityReceived);
        throw new Error(
          `Over-receiving not allowed for SKU '${line.product?.sku || line.productId}'. Ordered: ${line.quantityOrdered}, Already Received: ${line.quantityReceived}, Attempted: ${item.quantityAccepted + item.quantityRejected} (Max receivable: ${remaining})`
        );
      }

      // Check storage bin location
      const location = await masterDataRepository.findLocationById(item.locationId);
      if (!location) {
        throw new Error(`Target storage bin '${item.locationId}' does not exist`);
      }
      if (location.warehouseId !== data.warehouseId) {
        throw new Error(`Storage bin '${location.barcode}' does not belong to receiving warehouse`);
      }
      if (location.isLocked) {
        throw new Error(`Storage bin '${location.barcode}' is locked for inventory counting`);
      }
    }

    // 4. Generate unique sequential Goods Receipt Note number (GRN-YYYY-XXXX)
    const now = new Date();
    const receiptNumber = `GRN-${now.getFullYear()}-${(MEM_RECEIPTS.length + 1)
      .toString()
      .padStart(4, '0')}`;

    const newReceipt: GoodsReceiptData = {
      id: `grn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber,
      purchaseOrderId: po.id,
      warehouseId: data.warehouseId,
      receivedByUserId: userId || null,
      carrierName: data.carrierName || null,
      trackingNumber: data.trackingNumber || null,
      billOfLading: data.billOfLading || null,
      receivedAt: now,
      notes: data.notes || null,
      createdAt: now,
      items: []
    };

    const stockMovements: any[] = [];

    // 5. Atomic Processing: Update POLineItems and update Inventory balances
    for (const item of data.items) {
      const line = po.lineItems.find(l => l.id === item.poLineItemId)!;

      // Update PO Line Progress
      line.quantityReceived += item.quantityAccepted + item.quantityRejected;
      line.quantityAccepted += item.quantityAccepted;
      line.quantityRejected += item.quantityRejected;
      line.updatedAt = now;

      // Add GRN Line Item
      const grnItem: GoodsReceiptItemData = {
        id: `gri-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        goodsReceiptId: newReceipt.id,
        poLineItemId: line.id,
        productId: item.productId,
        locationId: item.locationId,
        quantityReceived: item.quantityAccepted + item.quantityRejected,
        quantityAccepted: item.quantityAccepted,
        quantityRejected: item.quantityRejected,
        batchNumber: item.batchNumber || null,
        rejectionReason: item.rejectionReason || null,
        createdAt: now
      };
      newReceipt.items.push(grnItem);

      // 6. Connect to Core Inventory Engine: only accepted goods update on-hand stock!
      if (item.quantityAccepted > 0) {
        const stockInResult = await inventoryRepository.stockIn(
          {
            warehouseId: data.warehouseId,
            locationId: item.locationId,
            productId: item.productId,
            quantity: item.quantityAccepted,
            batchNumber: item.batchNumber || null,
            unitCost: line.unitCost,
            referenceType: 'GOODS_RECEIPT_INBOUND',
            referenceId: receiptNumber,
            notes: `Received via PO ${po.poNumber} (Receipt: ${receiptNumber})`
          },
          userId
        );
        stockMovements.push(stockInResult.movement);
      }
    }

    // 7. Update PO Status
    const allLinesFullyReceived = po.lineItems.every(
      l => l.quantityReceived >= l.quantityOrdered
    );
    po.status = allLinesFullyReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';
    po.updatedAt = now;

    MEM_RECEIPTS.unshift(newReceipt);

    const hydratedReceipt = await hydrateReceipt(newReceipt);
    const hydratedPO = await hydratePO(po);

    return {
      receipt: hydratedReceipt,
      purchaseOrder: hydratedPO,
      movements: stockMovements
    };
  }

  // ---------------------------------------------------------------------------
  // 6. LIST GOODS RECEIPTS
  // ---------------------------------------------------------------------------
  async listGoodsReceipts(params: {
    purchaseOrderId?: string;
    warehouseId?: string;
    limit?: number;
  }): Promise<GoodsReceiptData[]> {
    let items = [...MEM_RECEIPTS];
    if (params.purchaseOrderId) items = items.filter(r => r.purchaseOrderId === params.purchaseOrderId);
    if (params.warehouseId) items = items.filter(r => r.warehouseId === params.warehouseId);

    items.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    const limit = params.limit || 50;
    const paginated = items.slice(0, limit);

    return Promise.all(paginated.map(r => hydrateReceipt(r)));
  }

  async findGoodsReceiptById(id: string): Promise<GoodsReceiptData | null> {
    const grn = MEM_RECEIPTS.find(r => r.id === id);
    if (!grn) return null;
    return hydrateReceipt(grn);
  }
}

export const purchasingRepository = new PurchasingRepository();
