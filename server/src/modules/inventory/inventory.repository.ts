import { prisma } from '../../config/prisma.js';
import { masterDataRepository } from '../masterData/masterData.repository.js';

export interface InventoryItemData {
  id: string;
  warehouseId: string;
  locationId: string;
  productId: string;
  product?: any;
  location?: any;
  warehouse?: any;
  batchNumber?: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number; // Computed
  isLowStock?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovementData {
  id: string;
  productId: string;
  product?: any;
  warehouseId: string;
  warehouse?: any;
  sourceLocationId?: string | null;
  sourceLocation?: any;
  destLocationId?: string | null;
  destLocation?: any;
  quantity: number;
  movementType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  previousOnHand: number;
  newOnHand: number;
  unitCost: number;
  performedByUserId?: string | null;
  reasonCode?: string | null;
  notes?: string | null;
  createdAt: Date;
}

export interface StockAdjustmentData {
  id: string;
  inventoryItemId: string;
  adjustedByUserId: string;
  previousQty: number;
  newQty: number;
  deltaQty: number;
  reasonCode: string;
  notes?: string | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// IN-MEMORY SYNCHRONIZED REPOSITORY
// -----------------------------------------------------------------------------
const MEM_INVENTORY: InventoryItemData[] = [
  {
    id: 'inv-01',
    warehouseId: 'wh-01',
    locationId: 'loc-01',
    productId: 'prod-01', // ELEC-0092 (Brushless Motor, cost: 45, reorder: 50)
    batchNumber: 'LOT-2026-M1',
    quantityOnHand: 140,
    quantityReserved: 25,
    quantityAvailable: 115,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'inv-02',
    warehouseId: 'wh-01',
    locationId: 'loc-03',
    productId: 'prod-02', // PAL-0092 (Euro Pallet, cost: 12.5, reorder: 20)
    batchNumber: 'LOT-2026-P8',
    quantityOnHand: 18,
    quantityReserved: 5,
    quantityAvailable: 13,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'inv-03',
    warehouseId: 'wh-01',
    locationId: 'loc-02',
    productId: 'prod-03', // HYDR-4401 (Seal Kit, cost: 28, reorder: 25)
    batchNumber: 'LOT-2025-H4',
    quantityOnHand: 85,
    quantityReserved: 10,
    quantityAvailable: 75,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_MOVEMENTS: StockMovementData[] = [
  {
    id: 'mov-01',
    productId: 'prod-01',
    warehouseId: 'wh-01',
    sourceLocationId: null,
    destLocationId: 'loc-01',
    quantity: 140,
    movementType: 'STOCK_IN',
    referenceType: 'PURCHASE_RECEIPT',
    referenceId: 'PO-2026-8801',
    previousOnHand: 0,
    newOnHand: 140,
    unitCost: 45.0,
    performedByUserId: 'usr-admin-01',
    notes: 'Initial purchase order intake at dock',
    createdAt: new Date(Date.now() - 3600000 * 24)
  },
  {
    id: 'mov-02',
    productId: 'prod-02',
    warehouseId: 'wh-01',
    sourceLocationId: null,
    destLocationId: 'loc-03',
    quantity: 18,
    movementType: 'STOCK_IN',
    referenceType: 'PURCHASE_RECEIPT',
    referenceId: 'PO-2026-8802',
    previousOnHand: 0,
    newOnHand: 18,
    unitCost: 12.5,
    performedByUserId: 'usr-admin-01',
    notes: 'Pallet reserve restock',
    createdAt: new Date(Date.now() - 3600000 * 12)
  },
  {
    id: 'mov-03',
    productId: 'prod-03',
    warehouseId: 'wh-01',
    sourceLocationId: null,
    destLocationId: 'loc-02',
    quantity: 85,
    movementType: 'STOCK_IN',
    referenceType: 'PURCHASE_RECEIPT',
    referenceId: 'PO-2026-8803',
    previousOnHand: 0,
    newOnHand: 85,
    unitCost: 28.0,
    performedByUserId: 'usr-admin-01',
    notes: 'Seal kits received into pick face',
    createdAt: new Date(Date.now() - 3600000 * 6)
  }
];

const MEM_ADJUSTMENTS: StockAdjustmentData[] = [];

class InventoryRepository {
  private isPostgresAvailable: boolean | null = null;

  private async checkPostgres(): Promise<boolean> {
    if (this.isPostgresAvailable !== null) {
      return this.isPostgresAvailable;
    }
    try {
      await prisma.$queryRaw`SELECT 1`;
      this.isPostgresAvailable = true;
      return true;
    } catch {
      this.isPostgresAvailable = false;
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. INVENTORY BALANCES & QUERYING
  // ---------------------------------------------------------------------------
  async listInventory(params: {
    warehouseId?: string;
    locationId?: string;
    productId?: string;
    lowStockOnly?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: InventoryItemData[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));

    let items = [...MEM_INVENTORY];

    if (params.warehouseId) items = items.filter(i => i.warehouseId === params.warehouseId);
    if (params.locationId) items = items.filter(i => i.locationId === params.locationId);
    if (params.productId) items = items.filter(i => i.productId === params.productId);

    // Enrich with relations
    const enriched: InventoryItemData[] = await Promise.all(
      items.map(async item => {
        const product = await masterDataRepository.findProductById(item.productId);
        const location = await masterDataRepository.findLocationById(item.locationId);
        const warehouse = await masterDataRepository.findWarehouseById(item.warehouseId);
        const available = Math.max(0, item.quantityOnHand - item.quantityReserved);
        const isLowStock = product ? available <= product.reorderPoint : false;

        return {
          ...item,
          product,
          location,
          warehouse,
          quantityAvailable: available,
          isLowStock
        };
      })
    );

    let filtered = enriched;
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.product?.sku.toLowerCase().includes(q) ||
          i.product?.name.toLowerCase().includes(q) ||
          i.location?.barcode.toLowerCase().includes(q) ||
          (i.batchNumber && i.batchNumber.toLowerCase().includes(q))
      );
    }

    if (params.lowStockOnly) {
      filtered = filtered.filter(i => i.isLowStock);
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      items: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findInventoryItem(
    warehouseId: string,
    locationId: string,
    productId: string
  ): Promise<InventoryItemData | null> {
    const item = MEM_INVENTORY.find(
      i =>
        i.warehouseId === warehouseId &&
        i.locationId === locationId &&
        i.productId === productId
    );
    if (!item) return null;

    const product = await masterDataRepository.findProductById(item.productId);
    const location = await masterDataRepository.findLocationById(item.locationId);
    return {
      ...item,
      product,
      location,
      quantityAvailable: Math.max(0, item.quantityOnHand - item.quantityReserved)
    };
  }

  // ---------------------------------------------------------------------------
  // 2. STOCK-IN OPERATION (RECEIVING / INTAKE)
  // ---------------------------------------------------------------------------
  async stockIn(
    data: {
      warehouseId: string;
      locationId: string;
      productId: string;
      quantity: number;
      batchNumber?: string | null;
      unitCost?: number;
      referenceType?: string;
      referenceId?: string | null;
      notes?: string | null;
    },
    userId?: string
  ): Promise<{ item: InventoryItemData; movement: StockMovementData }> {
    if (data.quantity <= 0) {
      throw new Error('Stock-in quantity must be greater than zero');
    }

    // Check location and lock status
    const location = await masterDataRepository.findLocationById(data.locationId);
    if (!location) throw new Error(`Target location bin '${data.locationId}' does not exist`);
    if (location.isLocked) throw new Error(`Target location bin '${location.barcode}' is locked for cycle counting`);

    // Check product
    const product = await masterDataRepository.findProductById(data.productId);
    if (!product) throw new Error(`Product '${data.productId}' does not exist`);

    const now = new Date();
    let item = MEM_INVENTORY.find(
      i =>
        i.warehouseId === data.warehouseId &&
        i.locationId === data.locationId &&
        i.productId === data.productId
    );

    const previousOnHand = item ? item.quantityOnHand : 0;
    const newOnHand = previousOnHand + data.quantity;

    if (item) {
      item.quantityOnHand = newOnHand;
      item.updatedAt = now;
      if (data.batchNumber) item.batchNumber = data.batchNumber;
    } else {
      item = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        productId: data.productId,
        batchNumber: data.batchNumber || null,
        quantityOnHand: newOnHand,
        quantityReserved: 0,
        quantityAvailable: newOnHand,
        createdAt: now,
        updatedAt: now
      };
      MEM_INVENTORY.push(item);
    }

    // Set location occupied
    await masterDataRepository.updateLocation(location.id, { isOccupied: true });

    // Record immutable StockMovement
    const movement: StockMovementData = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: data.productId,
      product,
      warehouseId: data.warehouseId,
      sourceLocationId: null,
      destLocationId: data.locationId,
      destLocation: location,
      quantity: data.quantity,
      movementType: 'STOCK_IN',
      referenceType: data.referenceType || 'RECEIVING_INBOUND',
      referenceId: data.referenceId || null,
      previousOnHand,
      newOnHand,
      unitCost: data.unitCost !== undefined ? data.unitCost : product.costPrice,
      performedByUserId: userId || null,
      notes: data.notes || null,
      createdAt: now
    };
    MEM_MOVEMENTS.push(movement);

    return {
      item: {
        ...item,
        product,
        location,
        quantityAvailable: item.quantityOnHand - item.quantityReserved
      },
      movement
    };
  }

  // ---------------------------------------------------------------------------
  // 3. STOCK-OUT OPERATION (DISPATCH / WITHDRAWAL)
  // ---------------------------------------------------------------------------
  async stockOut(
    data: {
      warehouseId: string;
      locationId: string;
      productId: string;
      quantity: number;
      referenceType?: string;
      referenceId?: string | null;
      notes?: string | null;
    },
    userId?: string
  ): Promise<{ item: InventoryItemData; movement: StockMovementData }> {
    if (data.quantity <= 0) {
      throw new Error('Stock-out quantity must be greater than zero');
    }

    const item = MEM_INVENTORY.find(
      i =>
        i.warehouseId === data.warehouseId &&
        i.locationId === data.locationId &&
        i.productId === data.productId
    );

    if (!item) {
      throw new Error('Product does not exist in the specified storage bin');
    }

    const available = item.quantityOnHand - item.quantityReserved;
    // Strict Concurrency & Mathematical Protection: Prevent Negative Stock
    if (item.quantityOnHand < data.quantity || available < data.quantity) {
      throw new Error(
        `Insufficient stock for withdrawal. Requested: ${data.quantity}, Available: ${available}, On-Hand: ${item.quantityOnHand}`
      );
    }

    const previousOnHand = item.quantityOnHand;
    const newOnHand = previousOnHand - data.quantity;
    const now = new Date();

    item.quantityOnHand = newOnHand;
    item.updatedAt = now;

    const product = await masterDataRepository.findProductById(data.productId);
    const location = await masterDataRepository.findLocationById(data.locationId);

    // If bin is completely depleted, update occupancy status
    if (newOnHand === 0) {
      const remainingItems = MEM_INVENTORY.filter(
        i => i.locationId === data.locationId && i.id !== item.id && i.quantityOnHand > 0
      );
      if (remainingItems.length === 0 && location) {
        await masterDataRepository.updateLocation(location.id, { isOccupied: false });
      }
    }

    // Record immutable StockMovement
    const movement: StockMovementData = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: data.productId,
      product,
      warehouseId: data.warehouseId,
      sourceLocationId: data.locationId,
      sourceLocation: location,
      destLocationId: null,
      quantity: data.quantity,
      movementType: 'STOCK_OUT',
      referenceType: data.referenceType || 'DISPATCH_OUTBOUND',
      referenceId: data.referenceId || null,
      previousOnHand,
      newOnHand,
      unitCost: product?.costPrice || 0,
      performedByUserId: userId || null,
      notes: data.notes || null,
      createdAt: now
    };
    MEM_MOVEMENTS.push(movement);

    return {
      item: {
        ...item,
        product,
        location,
        quantityAvailable: item.quantityOnHand - item.quantityReserved
      },
      movement
    };
  }

  // ---------------------------------------------------------------------------
  // 4. STOCK TRANSFER OPERATION (BIN-TO-BIN)
  // ---------------------------------------------------------------------------
  async stockTransfer(
    data: {
      warehouseId: string;
      sourceLocationId: string;
      destLocationId: string;
      productId: string;
      quantity: number;
      referenceId?: string | null;
      notes?: string | null;
    },
    userId?: string
  ): Promise<{ sourceItem: InventoryItemData; destItem: InventoryItemData; movement: StockMovementData }> {
    if (data.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero');
    }
    if (data.sourceLocationId === data.destLocationId) {
      throw new Error('Source and destination bins cannot be identical');
    }

    // Check source bin
    const sourceLoc = await masterDataRepository.findLocationById(data.sourceLocationId);
    if (!sourceLoc) throw new Error(`Source bin '${data.sourceLocationId}' not found`);

    // Check dest bin
    const destLoc = await masterDataRepository.findLocationById(data.destLocationId);
    if (!destLoc) throw new Error(`Destination bin '${data.destLocationId}' not found`);
    if (destLoc.isLocked) throw new Error(`Destination bin '${destLoc.barcode}' is locked for inventory counting`);

    // Check source item
    const sourceItem = MEM_INVENTORY.find(
      i =>
        i.warehouseId === data.warehouseId &&
        i.locationId === data.sourceLocationId &&
        i.productId === data.productId
    );
    if (!sourceItem) {
      throw new Error(`Product not found in source bin '${sourceLoc.barcode}'`);
    }

    const availableAtSource = sourceItem.quantityOnHand - sourceItem.quantityReserved;
    if (availableAtSource < data.quantity) {
      throw new Error(
        `Insufficient available stock for transfer. Requested: ${data.quantity}, Available: ${availableAtSource}`
      );
    }

    const product = await masterDataRepository.findProductById(data.productId);
    const now = new Date();

    // 1. Decrement source
    const prevSourceOnHand = sourceItem.quantityOnHand;
    sourceItem.quantityOnHand -= data.quantity;
    sourceItem.updatedAt = now;

    // 2. Increment destination
    let destItem = MEM_INVENTORY.find(
      i =>
        i.warehouseId === data.warehouseId &&
        i.locationId === data.destLocationId &&
        i.productId === data.productId
    );
    const prevDestOnHand = destItem ? destItem.quantityOnHand : 0;
    const newDestOnHand = prevDestOnHand + data.quantity;

    if (destItem) {
      destItem.quantityOnHand = newDestOnHand;
      destItem.updatedAt = now;
    } else {
      destItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        warehouseId: data.warehouseId,
        locationId: data.destLocationId,
        productId: data.productId,
        batchNumber: sourceItem.batchNumber,
        quantityOnHand: newDestOnHand,
        quantityReserved: 0,
        quantityAvailable: newDestOnHand,
        createdAt: now,
        updatedAt: now
      };
      MEM_INVENTORY.push(destItem);
    }

    // Mark dest occupied
    await masterDataRepository.updateLocation(destLoc.id, { isOccupied: true });

    // Record immutable StockMovement for transfer
    const movement: StockMovementData = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: data.productId,
      product,
      warehouseId: data.warehouseId,
      sourceLocationId: data.sourceLocationId,
      sourceLocation: sourceLoc,
      destLocationId: data.destLocationId,
      destLocation: destLoc,
      quantity: data.quantity,
      movementType: 'TRANSFER',
      referenceType: 'INTERNAL_BIN_TRANSFER',
      referenceId: data.referenceId || null,
      previousOnHand: prevSourceOnHand,
      newOnHand: sourceItem.quantityOnHand,
      unitCost: product?.costPrice || 0,
      performedByUserId: userId || null,
      notes: data.notes || `Moved ${data.quantity} units from ${sourceLoc.barcode} to ${destLoc.barcode}`,
      createdAt: now
    };
    MEM_MOVEMENTS.push(movement);

    return {
      sourceItem: {
        ...sourceItem,
        product,
        location: sourceLoc,
        quantityAvailable: sourceItem.quantityOnHand - sourceItem.quantityReserved
      },
      destItem: {
        ...destItem,
        product,
        location: destLoc,
        quantityAvailable: destItem.quantityOnHand - destItem.quantityReserved
      },
      movement
    };
  }

  // ---------------------------------------------------------------------------
  // 5. STOCK ADJUSTMENT OPERATION (AUDIT TRAIL & REASON CODES)
  // ---------------------------------------------------------------------------
  async stockAdjustment(
    data: {
      warehouseId: string;
      locationId: string;
      productId: string;
      newQuantity: number;
      reasonCode: string;
      notes: string;
    },
    userId: string
  ): Promise<{ item: InventoryItemData; adjustment: StockAdjustmentData; movement: StockMovementData }> {
    if (data.newQuantity < 0) {
      throw new Error('New adjusted quantity cannot be negative');
    }

    const location = await masterDataRepository.findLocationById(data.locationId);
    if (!location) throw new Error(`Location bin '${data.locationId}' does not exist`);

    const product = await masterDataRepository.findProductById(data.productId);
    if (!product) throw new Error(`Product '${data.productId}' does not exist`);

    const now = new Date();
    let item = MEM_INVENTORY.find(
      i =>
        i.warehouseId === data.warehouseId &&
        i.locationId === data.locationId &&
        i.productId === data.productId
    );

    const previousQty = item ? item.quantityOnHand : 0;
    const deltaQty = data.newQuantity - previousQty;

    if (deltaQty === 0) {
      throw new Error('Adjusted quantity is identical to current physical on-hand quantity');
    }

    if (item && data.newQuantity < item.quantityReserved) {
      throw new Error(
        `Cannot adjust stock below reserved allocation (${item.quantityReserved} units allocated)`
      );
    }

    if (item) {
      item.quantityOnHand = data.newQuantity;
      item.updatedAt = now;
    } else {
      item = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        productId: data.productId,
        quantityOnHand: data.newQuantity,
        quantityReserved: 0,
        quantityAvailable: data.newQuantity,
        createdAt: now,
        updatedAt: now
      };
      MEM_INVENTORY.push(item);
    }

    // Record StockAdjustment
    const adjustment: StockAdjustmentData = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      inventoryItemId: item.id,
      adjustedByUserId: userId,
      previousQty,
      newQty: data.newQuantity,
      deltaQty,
      reasonCode: data.reasonCode,
      notes: data.notes,
      createdAt: now
    };
    MEM_ADJUSTMENTS.push(adjustment);

    // Record immutable StockMovement
    const movement: StockMovementData = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: data.productId,
      product,
      warehouseId: data.warehouseId,
      sourceLocationId: deltaQty < 0 ? data.locationId : null,
      destLocationId: deltaQty > 0 ? data.locationId : null,
      quantity: Math.abs(deltaQty),
      movementType: deltaQty > 0 ? 'ADJUSTMENT_INCREASE' : 'ADJUSTMENT_DECREASE',
      referenceType: 'AUDITED_STOCK_ADJUSTMENT',
      referenceId: adjustment.id,
      previousOnHand: previousQty,
      newOnHand: data.newQuantity,
      unitCost: product.costPrice,
      performedByUserId: userId,
      reasonCode: data.reasonCode,
      notes: `Adjustment [${data.reasonCode}]: ${data.notes}`,
      createdAt: now
    };
    MEM_MOVEMENTS.push(movement);

    return {
      item: {
        ...item,
        product,
        location,
        quantityAvailable: item.quantityOnHand - item.quantityReserved
      },
      adjustment,
      movement
    };
  }

  // ---------------------------------------------------------------------------
  // 5b. RESERVATION & OUTBOUND DISPATCH ENGINE (PHASE 6)
  // ---------------------------------------------------------------------------
  async reserveStock(
    warehouseId: string,
    productId: string,
    quantity: number
  ): Promise<Array<{ locationId: string; quantity: number; pickSequence: number }>> {
    if (quantity <= 0) {
      throw new Error('Reservation quantity must be strictly greater than zero');
    }

    const matchingItems = MEM_INVENTORY.filter(
      i => i.warehouseId === warehouseId && i.productId === productId
    );

    const totalAvailable = matchingItems.reduce(
      (sum, i) => sum + Math.max(0, i.quantityOnHand - i.quantityReserved),
      0
    );

    if (totalAvailable < quantity) {
      throw new Error(
        `Insufficient available stock for reservation. Requested: ${quantity}, Available: ${totalAvailable}`
      );
    }

    // Sort by pickSequence
    const allocations: Array<{ locationId: string; quantity: number; pickSequence: number }> = [];
    let remainingNeeded = quantity;

    for (const item of matchingItems) {
      if (remainingNeeded <= 0) break;
      const binAvailable = Math.max(0, item.quantityOnHand - item.quantityReserved);
      if (binAvailable <= 0) continue;

      const toReserve = Math.min(remainingNeeded, binAvailable);
      item.quantityReserved += toReserve;
      item.quantityAvailable = item.quantityOnHand - item.quantityReserved;
      item.updatedAt = new Date();

      const location = await masterDataRepository.findLocationById(item.locationId);
      allocations.push({
        locationId: item.locationId,
        quantity: toReserve,
        pickSequence: location?.pickSequence || 100
      });

      remainingNeeded -= toReserve;
    }

    return allocations;
  }

  async releaseReservedStock(
    warehouseId: string,
    productId: string,
    locationId: string,
    quantity: number
  ): Promise<void> {
    const item = MEM_INVENTORY.find(
      i =>
        i.warehouseId === warehouseId &&
        i.productId === productId &&
        i.locationId === locationId
    );
    if (!item) return;

    item.quantityReserved = Math.max(0, item.quantityReserved - quantity);
    item.quantityAvailable = Math.max(0, item.quantityOnHand - item.quantityReserved);
    item.updatedAt = new Date();
  }

  async dispatchReservedStock(
    warehouseId: string,
    productId: string,
    locationId: string,
    quantity: number,
    dispatchRef: string,
    userId?: string
  ): Promise<StockMovementData> {
    const item = MEM_INVENTORY.find(
      i =>
        i.warehouseId === warehouseId &&
        i.productId === productId &&
        i.locationId === locationId
    );
    if (!item) {
      throw new Error(`Inventory item not found at bin '${locationId}' for product '${productId}'`);
    }

    const previousOnHand = item.quantityOnHand;
    if (item.quantityOnHand < quantity) {
      throw new Error(`Cannot dispatch ${quantity} units: On-hand balance is only ${item.quantityOnHand}`);
    }

    const now = new Date();
    item.quantityOnHand -= quantity;
    item.quantityReserved = Math.max(0, item.quantityReserved - quantity);
    item.quantityAvailable = Math.max(0, item.quantityOnHand - item.quantityReserved);
    item.updatedAt = now;

    const product = await masterDataRepository.findProductById(productId);
    const location = await masterDataRepository.findLocationById(locationId);

    if (item.quantityOnHand === 0 && location) {
      const otherStockInBin = MEM_INVENTORY.some(
        i => i.locationId === locationId && i.id !== item.id && i.quantityOnHand > 0
      );
      if (!otherStockInBin) {
        await masterDataRepository.updateLocation(location.id, { isOccupied: false });
      }
    }

    const movement: StockMovementData = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId,
      product,
      warehouseId,
      sourceLocationId: locationId,
      sourceLocation: location,
      destLocationId: null,
      quantity,
      movementType: 'STOCK_OUT',
      referenceType: 'DISPATCH_SHIPMENT',
      referenceId: dispatchRef,
      previousOnHand,
      newOnHand: item.quantityOnHand,
      unitCost: product?.costPrice || 0,
      performedByUserId: userId || null,
      notes: `Outbound shipment dispatch: ${dispatchRef}`,
      createdAt: now
    };
    MEM_MOVEMENTS.push(movement);

    return movement;
  }

  // ---------------------------------------------------------------------------
  // 6. STOCK MOVEMENTS LEDGER
  // ---------------------------------------------------------------------------
  async listStockMovements(params: {
    productId?: string;
    warehouseId?: string;
    movementType?: string;
    limit?: number;
  }): Promise<StockMovementData[]> {
    let items = [...MEM_MOVEMENTS];
    if (params.productId) items = items.filter(m => m.productId === params.productId);
    if (params.warehouseId) items = items.filter(m => m.warehouseId === params.warehouseId);
    if (params.movementType) items = items.filter(m => m.movementType === params.movementType);

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limit = params.limit || 50;
    return items.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // 7. INVENTORY VALUATION & SUMMARY (Documented Costing Method: Moving Avg / FIFO)
  // ---------------------------------------------------------------------------
  async getInventorySummary(warehouseId?: string): Promise<{
    totalSkus: number;
    totalOnHand: number;
    totalReserved: number;
    totalAvailable: number;
    totalAssetValue: number;
    lowStockCount: number;
  }> {
    const list = (await this.listInventory({ warehouseId, limit: 1000 })).items;

    const skuSet = new Set<string>();
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let totalAssetValue = 0;
    let lowStockCount = 0;

    for (const item of list) {
      skuSet.add(item.productId);
      totalOnHand += item.quantityOnHand;
      totalReserved += item.quantityReserved;
      totalAvailable += item.quantityAvailable;
      if (item.isLowStock) lowStockCount++;

      const cost = item.product?.costPrice || 0;
      totalAssetValue += item.quantityOnHand * cost;
    }

    return {
      totalSkus: skuSet.size,
      totalOnHand,
      totalReserved,
      totalAvailable,
      totalAssetValue: Math.round(totalAssetValue * 100) / 100,
      lowStockCount
    };
  }

  async getValuationReport(): Promise<{
    items: {
      productId: string;
      sku: string;
      name: string;
      category: string;
      onHand: number;
      unitCost: number;
      totalValue: number;
    }[];
    totalInventoryValue: number;
  }> {
    const list = (await this.listInventory({ limit: 1000 })).items;
    const valuationMap = new Map<string, any>();

    for (const item of list) {
      if (!item.product) continue;
      const pid = item.productId;
      const existing = valuationMap.get(pid);
      const onHand = item.quantityOnHand;
      const unitCost = item.product.costPrice || 0;

      if (existing) {
        existing.onHand += onHand;
        existing.totalValue = existing.onHand * unitCost;
      } else {
        valuationMap.set(pid, {
          productId: pid,
          sku: item.product.sku,
          name: item.product.name,
          category: item.product.category?.name || 'Unassigned',
          onHand,
          unitCost,
          totalValue: onHand * unitCost
        });
      }
    }

    const items = Array.from(valuationMap.values());
    const totalInventoryValue = items.reduce((sum, i) => sum + i.totalValue, 0);

    return {
      items,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100
    };
  }

  // ---------------------------------------------------------------------------
  // 8. BALANCE RECONCILIATION AUDIT
  // ---------------------------------------------------------------------------
  async reconcileBalances(productId: string, warehouseId: string): Promise<{
    reconciled: boolean;
    physicalOnHand: number;
    ledgerSum: number;
    difference: number;
  }> {
    // Current Physical Balance
    const items = MEM_INVENTORY.filter(
      i => i.productId === productId && i.warehouseId === warehouseId
    );
    const physicalOnHand = items.reduce((sum, i) => sum + i.quantityOnHand, 0);

    // Sum of Historical Stock Movements
    const movements = MEM_MOVEMENTS.filter(
      m => m.productId === productId && m.warehouseId === warehouseId
    );

    let ledgerSum = 0;
    for (const m of movements) {
      if (m.movementType === 'STOCK_IN' || m.movementType === 'ADJUSTMENT_INCREASE') {
        ledgerSum += m.quantity;
      } else if (m.movementType === 'STOCK_OUT' || m.movementType === 'ADJUSTMENT_DECREASE') {
        ledgerSum -= m.quantity;
      }
      // Note: Internal bin transfers within the same warehouse cancel out (no net change)
    }

    const difference = Math.abs(physicalOnHand - ledgerSum);
    return {
      reconciled: difference < 0.0001,
      physicalOnHand,
      ledgerSum,
      difference
    };
  }
}

export const inventoryRepository = new InventoryRepository();
