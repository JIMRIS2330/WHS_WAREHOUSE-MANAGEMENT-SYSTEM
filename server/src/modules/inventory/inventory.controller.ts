import { Request, Response } from 'express';
import {
  stockInSchema,
  stockOutSchema,
  stockTransferSchema,
  stockAdjustmentSchema
} from './inventory.schema.js';
import { inventoryRepository } from './inventory.repository.js';
import { authRepository } from '../auth/auth.repository.js';

// =============================================================================
// 1. INVENTORY LIST & DETAILS
// =============================================================================
export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, locationId, productId, isLowStock, search, page, limit } = req.query;

    const result = await inventoryRepository.listInventory({
      warehouseId: warehouseId as string | undefined,
      locationId: locationId as string | undefined,
      productId: productId as string | undefined,
      lowStockOnly: isLowStock !== undefined ? isLowStock === 'true' : undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20
    });

    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to fetch inventory balances' }
    });
  }
};

export const getInventorySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined;
    const summary = await inventoryRepository.getInventorySummary(warehouseId);
    res.status(200).json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to fetch inventory summary' }
    });
  }
};

// =============================================================================
// 2. STOCK MOVEMENTS (IMMUTABLE LEDGER)
// =============================================================================
export const getStockMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, warehouseId, movementType, limit } = req.query;

    const movements = await inventoryRepository.listStockMovements({
      productId: productId as string | undefined,
      warehouseId: warehouseId as string | undefined,
      movementType: movementType as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50
    });

    res.status(200).json({ success: true, data: movements, count: movements.length });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve stock movement ledger' }
    });
  }
};

// =============================================================================
// 3. STOCK-IN TRANSACTION
// =============================================================================
export const stockIn = async (req: Request, res: Response): Promise<void> => {
  const validation = stockInSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid stock-in parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const result = await inventoryRepository.stockIn(validation.data, userId);

    await authRepository.logAudit({
      userId,
      action: 'STOCK_IN',
      entity: 'InventoryItem',
      entityId: result.item.id,
      details: `Stock-in ${validation.data.quantity} units to bin ${validation.data.locationId}. Ref: ${validation.data.referenceId || 'N/A'}`
    });

    res.status(201).json({
      success: true,
      message: `Successfully received ${validation.data.quantity} units into inventory`,
      data: result
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'STOCK_IN_FAILED', message: err.message }
    });
  }
};

// =============================================================================
// 4. STOCK-OUT TRANSACTION (WITH NEGATIVE STOCK REJECTION)
// =============================================================================
export const stockOut = async (req: Request, res: Response): Promise<void> => {
  const validation = stockOutSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid stock-out parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const result = await inventoryRepository.stockOut(validation.data, userId);

    await authRepository.logAudit({
      userId,
      action: 'STOCK_OUT',
      entity: 'InventoryItem',
      entityId: result.item.id,
      details: `Stock-out ${validation.data.quantity} units from bin ${validation.data.locationId}. Ref: ${validation.data.referenceId || 'N/A'}`
    });

    res.status(200).json({
      success: true,
      message: `Successfully dispatched ${validation.data.quantity} units from inventory`,
      data: result
    });
  } catch (err: any) {
    const isInsufficient = err.message.toLowerCase().includes('insufficient') || err.message.includes('Negative stock prevented');
    res.status(isInsufficient ? 422 : 400).json({
      success: false,
      error: {
        code: isInsufficient ? 'INSUFFICIENT_STOCK' : 'STOCK_OUT_FAILED',
        message: err.message
      }
    });
  }
};

// =============================================================================
// 5. ATOMIC BIN-TO-BIN STOCK TRANSFER
// =============================================================================
export const stockTransfer = async (req: Request, res: Response): Promise<void> => {
  const validation = stockTransferSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid stock transfer parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const result = await inventoryRepository.stockTransfer(validation.data, userId);

    await authRepository.logAudit({
      userId,
      action: 'STOCK_TRANSFER',
      entity: 'InventoryItem',
      entityId: result.sourceItem.id,
      details: `Transferred ${validation.data.quantity} units from bin ${validation.data.sourceLocationId} to bin ${validation.data.destLocationId}`
    });

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${validation.data.quantity} units to target bin`,
      data: result
    });
  } catch (err: any) {
    const isInsufficient = err.message.toLowerCase().includes('insufficient');
    res.status(isInsufficient ? 422 : 400).json({
      success: false,
      error: {
        code: isInsufficient ? 'INSUFFICIENT_STOCK' : 'TRANSFER_FAILED',
        message: err.message
      }
    });
  }
};

// =============================================================================
// 6. AUDITED REASON-CODED STOCK ADJUSTMENT
// =============================================================================
export const stockAdjustment = async (req: Request, res: Response): Promise<void> => {
  const validation = stockAdjustmentSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid stock adjustment parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id || 'usr-admin-01';
    const result = await inventoryRepository.stockAdjustment(validation.data, userId);

    await authRepository.logAudit({
      userId,
      action: 'STOCK_ADJUSTMENT',
      entity: 'StockAdjustment',
      entityId: result.adjustment.id,
      details: `Adjusted inventory from ${result.adjustment.previousQty} to ${result.adjustment.newQty} (delta: ${result.adjustment.deltaQty}). Reason: ${validation.data.reasonCode}`
    });

    res.status(200).json({
      success: true,
      message: `Stock successfully adjusted to ${validation.data.newQuantity} units`,
      data: result
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'ADJUSTMENT_FAILED', message: err.message }
    });
  }
};

// =============================================================================
// 7. VALUATION REPORT
// =============================================================================
export const getValuationReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await inventoryRepository.getValuationReport();
    res.status(200).json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to generate valuation report' }
    });
  }
};

// =============================================================================
// 8. LEDGER RECONCILIATION AUDIT
// =============================================================================
export const getReconciliation = async (req: Request, res: Response): Promise<void> => {
  const { productId, warehouseId } = req.query;
  if (!productId || !warehouseId) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Both productId and warehouseId are required for reconciliation' }
    });
    return;
  }

  try {
    const result = await inventoryRepository.reconcileBalances(
      productId as string,
      warehouseId as string
    );
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to reconcile stock balances' }
    });
  }
};
