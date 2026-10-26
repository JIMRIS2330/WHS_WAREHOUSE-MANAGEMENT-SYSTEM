import { Request, Response } from 'express';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  confirmGoodsReceiptSchema
} from './purchasing.schema.js';
import { purchasingRepository } from './purchasing.repository.js';
import { authRepository } from '../auth/auth.repository.js';

// =============================================================================
// 1. PURCHASE ORDERS CONTROLLERS
// =============================================================================
export const getPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, supplierId, warehouseId, search, page, limit } = req.query;

    const result = await purchasingRepository.listPurchaseOrders({
      status: status as string | undefined,
      supplierId: supplierId as string | undefined,
      warehouseId: warehouseId as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20
    });

    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list purchase orders' }
    });
  }
};

export const getPurchaseOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const po = await purchasingRepository.findPurchaseOrderById(req.params.id);
    if (!po) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Purchase order '${req.params.id}' not found` }
      });
      return;
    }
    res.status(200).json({ success: true, data: po });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
};

export const createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
  const validation = createPurchaseOrderSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid purchase order payload',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const po = await purchasingRepository.createPurchaseOrder(validation.data, userId);

    await authRepository.logAudit({
      userId,
      action: 'PO_CREATED',
      entity: 'PurchaseOrder',
      entityId: po.id,
      details: `Created Purchase Order ${po.poNumber} with ${po.lineItems.length} line items (Total: $${po.totalAmount})`
    });

    res.status(201).json({
      success: true,
      message: `Purchase Order ${po.poNumber} created successfully`,
      data: po
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'PO_CREATION_FAILED', message: err.message }
    });
  }
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const validation = updatePurchaseOrderStatusSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid status update payload',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const po = await purchasingRepository.updatePurchaseOrderStatus(
      req.params.id,
      validation.data.status,
      validation.data.notes
    );

    await authRepository.logAudit({
      userId,
      action: `PO_${validation.data.status}`,
      entity: 'PurchaseOrder',
      entityId: po.id,
      details: `Updated Purchase Order ${po.poNumber} status to ${validation.data.status}`
    });

    res.status(200).json({
      success: true,
      message: `Purchase Order status updated to ${validation.data.status}`,
      data: po
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'PO_UPDATE_FAILED', message: err.message }
    });
  }
};

// =============================================================================
// 2. GOODS RECEIVING (GRN) CONTROLLERS
// =============================================================================
export const getGoodsReceipts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { purchaseOrderId, warehouseId, limit } = req.query;

    const receipts = await purchasingRepository.listGoodsReceipts({
      purchaseOrderId: purchaseOrderId as string | undefined,
      warehouseId: warehouseId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50
    });

    res.status(200).json({ success: true, data: receipts, count: receipts.length });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list goods receipts' }
    });
  }
};

export const getGoodsReceiptById = async (req: Request, res: Response): Promise<void> => {
  try {
    const receipt = await purchasingRepository.findGoodsReceiptById(req.params.id);
    if (!receipt) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Goods receipt '${req.params.id}' not found` }
      });
      return;
    }
    res.status(200).json({ success: true, data: receipt });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
};

export const confirmGoodsReceipt = async (req: Request, res: Response): Promise<void> => {
  const validation = confirmGoodsReceiptSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid goods receipt confirmation parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const result = await purchasingRepository.confirmGoodsReceipt(validation.data, userId);

    await authRepository.logAudit({
      userId,
      action: 'GOODS_RECEIPT_CONFIRMED',
      entity: 'GoodsReceipt',
      entityId: result.receipt.id,
      details: `Confirmed receipt ${result.receipt.receiptNumber} for PO ${result.purchaseOrder.poNumber}. Total items: ${result.receipt.items.length}`
    });

    res.status(201).json({
      success: true,
      message: `Goods receipt note ${result.receipt.receiptNumber} confirmed and stock posted to inventory`,
      data: result
    });
  } catch (err: any) {
    const isOverReceiving = err.message.includes('Over-receiving not allowed');
    const isDuplicate = err.message.includes('Duplicate receipt submission');
    const isAlreadyFull = err.message.includes('already FULLY_RECEIVED');

    let code = 'RECEIPT_CONFIRMATION_FAILED';
    let status = 400;

    if (isOverReceiving) {
      code = 'OVER_RECEIVING_NOT_ALLOWED';
      status = 422;
    } else if (isDuplicate || isAlreadyFull) {
      code = 'DUPLICATE_RECEIPT_SUBMISSION';
      status = 409;
    }

    res.status(status).json({
      success: false,
      error: { code, message: err.message }
    });
  }
};
