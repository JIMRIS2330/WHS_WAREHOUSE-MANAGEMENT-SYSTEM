import { Request, Response } from 'express';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createCustomerOrderSchema,
  confirmPickTaskSchema,
  confirmPackingSchema,
  confirmDispatchSchema
} from './fulfillment.schema.js';
import { fulfillmentRepository } from './fulfillment.repository.js';
import { authRepository } from '../auth/auth.repository.js';

// =============================================================================
// 1. CUSTOMERS CONTROLLERS
// =============================================================================
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, isActive } = req.query;
    const customers = await fulfillmentRepository.listCustomers({
      search: search as string | undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });
    res.status(200).json({ success: true, data: customers, count: customers.length });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list customers' }
    });
  }
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await fulfillmentRepository.findCustomerById(req.params.id);
    if (!customer) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer '${req.params.id}' not found` }
      });
      return;
    }
    res.status(200).json({ success: true, data: customer });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  const validation = createCustomerSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid customer payload',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const customer = await fulfillmentRepository.createCustomer(validation.data);
    await authRepository.logAudit({
      userId: req.user?.id,
      action: 'CUSTOMER_CREATED',
      entity: 'Customer',
      entityId: customer.id,
      details: `Created customer: ${customer.name} (${customer.code})`
    });
    res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
  } catch (err: any) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  const validation = updateCustomerSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid customer update payload',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const customer = await fulfillmentRepository.updateCustomer(req.params.id, validation.data);
    res.status(200).json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
  }
};

// =============================================================================
// 2. CUSTOMER ORDERS CONTROLLERS
// =============================================================================
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customerId, warehouseId, search, page, limit } = req.query;

    const result = await fulfillmentRepository.listOrders({
      status: status as string | undefined,
      customerId: customerId as string | undefined,
      warehouseId: warehouseId as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20
    });

    res.status(200).json({ success: true, data: result.items, count: result.total, ...result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list customer orders' }
    });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await fulfillmentRepository.findOrderById(req.params.id);
    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Customer order '${req.params.id}' not found` }
      });
      return;
    }
    res.status(200).json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const validation = createCustomerOrderSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid customer order payload',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const order = await fulfillmentRepository.createOrder(validation.data, userId);

    await authRepository.logAudit({
      userId,
      action: 'ORDER_CREATED',
      entity: 'CustomerOrder',
      entityId: order.id,
      details: `Created customer order ${order.orderNumber} with ${order.lineItems.length} lines (Total: $${order.totalAmount})`
    });

    res.status(201).json({
      success: true,
      message: `Customer order ${order.orderNumber} created successfully`,
      data: order
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'ORDER_CREATION_FAILED', message: err.message }
    });
  }
};

export const confirmAndAllocateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const order = await fulfillmentRepository.confirmAndAllocateOrder(req.params.id, userId);

    await authRepository.logAudit({
      userId,
      action: 'ORDER_ALLOCATED',
      entity: 'CustomerOrder',
      entityId: order.id,
      details: `Allocated inventory and generated pick tasks for order ${order.orderNumber}`
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} successfully confirmed and stock reserved`,
      data: order
    });
  } catch (err: any) {
    const isInsufficient = err.message.includes('Insufficient available stock');
    res.status(isInsufficient ? 422 : 400).json({
      success: false,
      error: {
        code: isInsufficient ? 'INSUFFICIENT_STOCK' : 'ALLOCATION_FAILED',
        message: err.message
      }
    });
  }
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const reason = req.body?.reason;
    const order = await fulfillmentRepository.cancelOrder(req.params.id, reason, userId);

    await authRepository.logAudit({
      userId,
      action: 'ORDER_CANCELLED',
      entity: 'CustomerOrder',
      entityId: order.id,
      details: `Cancelled order ${order.orderNumber} and released reservations. Reason: ${reason || 'N/A'}`
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} cancelled and reserved stock released`,
      data: order
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CANCELLATION_FAILED', message: err.message }
    });
  }
};

// =============================================================================
// 3. PICKING WORKSTATION CONTROLLERS
// =============================================================================
export const getPickTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, warehouseId, status } = req.query;
    const tasks = await fulfillmentRepository.listPickTasks({
      orderId: orderId as string | undefined,
      warehouseId: warehouseId as string | undefined,
      status: status as string | undefined
    });
    res.status(200).json({ success: true, data: tasks, count: tasks.length });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list pick tasks' }
    });
  }
};

export const confirmPickTask = async (req: Request, res: Response): Promise<void> => {
  const validation = confirmPickTaskSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid pick confirmation parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const result = await fulfillmentRepository.confirmPickTask(
      req.params.id,
      validation.data.quantityPicked,
      validation.data.notes || undefined,
      userId
    );

    await authRepository.logAudit({
      userId,
      action: 'PICK_CONFIRMED',
      entity: 'PickTask',
      entityId: result.task.id,
      details: `Picked ${validation.data.quantityPicked} units for order ${result.order.orderNumber} at location ${result.task.location?.barcode}`
    });

    res.status(200).json({
      success: true,
      message: `Pick task confirmed (${result.task.status})`,
      data: result
    });
  } catch (err: any) {
    const isOverpick = err.message.includes('Over-picking blocked');
    res.status(isOverpick ? 422 : 400).json({
      success: false,
      error: {
        code: isOverpick ? 'OVER_PICKING_BLOCKED' : 'PICK_FAILED',
        message: err.message
      }
    });
  }
};

// =============================================================================
// 4. PACKING WORKSTATION CONTROLLERS
// =============================================================================
export const confirmPacking = async (req: Request, res: Response): Promise<void> => {
  const validation = confirmPackingSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid packing confirmation parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const order = await fulfillmentRepository.confirmPacking(
      req.params.id,
      validation.data.packageNotes || undefined,
      userId
    );

    await authRepository.logAudit({
      userId,
      action: 'ORDER_PACKED',
      entity: 'CustomerOrder',
      entityId: order.id,
      details: `Confirmed packing for order ${order.orderNumber}`
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} packed and verified for dispatch`,
      data: order
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'PACKING_FAILED', message: err.message }
    });
  }
};

// =============================================================================
// 5. DISPATCH & SHIPPING CONTROLLERS
// =============================================================================
export const confirmDispatch = async (req: Request, res: Response): Promise<void> => {
  const validation = confirmDispatchSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid dispatch confirmation parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const userId = req.user?.id;
    const result = await fulfillmentRepository.confirmDispatch(
      { ...validation.data, orderId: req.params.id },
      userId
    );

    await authRepository.logAudit({
      userId,
      action: 'ORDER_DISPATCHED',
      entity: 'Shipment',
      entityId: result.shipment.id,
      details: `Dispatched order ${result.order.orderNumber} via ${result.shipment.carrierName}. Tracking: ${result.shipment.trackingNumber || 'N/A'}`
    });

    res.status(200).json({
      success: true,
      message: `Order ${result.order.orderNumber} dispatched successfully! On-hand inventory deducted.`,
      data: result
    });
  } catch (err: any) {
    const isAlreadyDispatched = err.message.includes('already been dispatched');
    res.status(isAlreadyDispatched ? 409 : 400).json({
      success: false,
      error: {
        code: isAlreadyDispatched ? 'ALREADY_DISPATCHED' : 'DISPATCH_FAILED',
        message: err.message
      }
    });
  }
};

export const getShipments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, warehouseId, limit } = req.query;
    const shipments = await fulfillmentRepository.listShipments({
      orderId: orderId as string | undefined,
      warehouseId: warehouseId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50
    });
    res.status(200).json({ success: true, data: shipments, count: shipments.length });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list shipments' }
    });
  }
};
