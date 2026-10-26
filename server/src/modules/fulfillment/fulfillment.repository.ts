import { prisma } from '../../config/prisma.js';
import { masterDataRepository } from '../masterData/masterData.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateCustomerOrderInput,
  ConfirmDispatchInput
} from './fulfillment.schema.js';

export interface CustomerData {
  id: string;
  code: string;
  name: string;
  contactName?: string | null;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderLineItemData {
  id: string;
  orderId: string;
  productId: string;
  product?: any;
  quantityOrdered: number;
  quantityReserved: number;
  quantityPicked: number;
  quantityPacked: number;
  quantityDispatched: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
  pickTasks?: PickTaskData[];
}

export interface PickTaskData {
  id: string;
  orderId: string;
  orderLineItemId: string;
  productId: string;
  product?: any;
  locationId: string;
  location?: any;
  quantityToPick: number;
  quantityPicked: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PICKED' | 'SHORT_PICKED';
  pickSequence: number;
  pickedByUserId?: string | null;
  pickedAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
}

export interface ShipmentData {
  id: string;
  dispatchNumber: string;
  orderId: string;
  order?: CustomerOrderData;
  warehouseId: string;
  warehouse?: any;
  carrierName: string;
  trackingNumber?: string | null;
  shippingMethod?: string | null;
  dispatchedAt: Date;
  dispatchedByUserId?: string | null;
  notes?: string | null;
  createdAt: Date;
}

export interface CustomerOrderData {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: CustomerData;
  warehouseId: string;
  warehouse?: any;
  status:
    | 'DRAFT'
    | 'CONFIRMED'
    | 'ALLOCATED'
    | 'PICKING'
    | 'PICKED'
    | 'PACKED'
    | 'DISPATCHED'
    | 'CANCELLED';
  orderDate: Date;
  requiredDate?: Date | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingCountry?: string | null;
  totalAmount: number;
  notes?: string | null;
  createdByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: OrderLineItemData[];
  pickTasks?: PickTaskData[];
  shipments?: ShipmentData[];
}

// -----------------------------------------------------------------------------
// IN-MEMORY SYNCHRONIZED SEED STORE
// -----------------------------------------------------------------------------
const MEM_CUSTOMERS: CustomerData[] = [
  {
    id: 'cust-01',
    code: 'CUST-ACME',
    name: 'Acme Robotics Corp',
    contactName: 'Sarah Jenkins',
    email: 'procurement@acmerobotics.com',
    phone: '+1-312-555-0199',
    address: '400 Technology Way',
    city: 'Chicago',
    country: 'USA',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 30),
    updatedAt: new Date(Date.now() - 86400000 * 30)
  },
  {
    id: 'cust-02',
    code: 'CUST-TITAN',
    name: 'Titan Heavy Systems',
    contactName: 'Marcus Vance',
    email: 'orders@titanheavysystems.com',
    phone: '+1-214-555-0144',
    address: '1500 Machinery Blvd',
    city: 'Dallas',
    country: 'USA',
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 20),
    updatedAt: new Date(Date.now() - 86400000 * 20)
  }
];

const MEM_ORDERS: CustomerOrderData[] = [
  {
    id: 'ord-01',
    orderNumber: 'SO-2026-0001',
    customerId: 'cust-01',
    warehouseId: 'wh-01',
    status: 'ALLOCATED',
    orderDate: new Date(Date.now() - 86400000 * 2),
    requiredDate: new Date(Date.now() + 86400000 * 2),
    shippingAddress: '400 Technology Way, Dock 4',
    shippingCity: 'Chicago',
    shippingCountry: 'USA',
    totalAmount: 890.0,
    notes: 'Priority air delivery requested',
    createdByUserId: 'usr-admin-01',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 1),
    lineItems: [
      {
        id: 'oli-01',
        orderId: 'ord-01',
        productId: 'prod-01', // ELEC-0092
        quantityOrdered: 10,
        quantityReserved: 10,
        quantityPicked: 0,
        quantityPacked: 0,
        quantityDispatched: 0,
        unitPrice: 89.0,
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 86400000 * 1)
      }
    ]
  }
];

const MEM_PICK_TASKS: PickTaskData[] = [
  {
    id: 'pick-01',
    orderId: 'ord-01',
    orderLineItemId: 'oli-01',
    productId: 'prod-01',
    locationId: 'loc-01',
    quantityToPick: 10,
    quantityPicked: 0,
    status: 'PENDING',
    pickSequence: 10,
    createdAt: new Date(Date.now() - 86400000 * 1)
  }
];

const MEM_SHIPMENTS: ShipmentData[] = [];

// Helper to hydrate relations
async function hydrateOrder(order: CustomerOrderData): Promise<CustomerOrderData> {
  const customer = MEM_CUSTOMERS.find(c => c.id === order.customerId);
  const warehouse = await masterDataRepository.findWarehouseById(order.warehouseId);

  const hydratedLines = await Promise.all(
    order.lineItems.map(async line => {
      const product = await masterDataRepository.findProductById(line.productId);
      const tasks = MEM_PICK_TASKS.filter(t => t.orderLineItemId === line.id);
      return {
        ...line,
        product,
        pickTasks: tasks
      };
    })
  );

  const tasks = MEM_PICK_TASKS.filter(t => t.orderId === order.id);
  const hydratedTasks = await Promise.all(
    tasks.map(async t => {
      const product = await masterDataRepository.findProductById(t.productId);
      const location = await masterDataRepository.findLocationById(t.locationId);
      return {
        ...t,
        product,
        location
      };
    })
  );

  const shipments = MEM_SHIPMENTS.filter(s => s.orderId === order.id).map(s => {
    const { order: _o, ...rest } = s;
    return rest as ShipmentData;
  });

  return {
    ...order,
    customer,
    warehouse,
    lineItems: hydratedLines,
    pickTasks: hydratedTasks,
    shipments
  };
}

async function hydratePickTask(task: PickTaskData): Promise<PickTaskData> {
  const product = await masterDataRepository.findProductById(task.productId);
  const location = await masterDataRepository.findLocationById(task.locationId);
  return {
    ...task,
    product,
    location
  };
}

export class FulfillmentRepository {
  // ---------------------------------------------------------------------------
  // 1. CUSTOMERS CRUD
  // ---------------------------------------------------------------------------
  async listCustomers(params: { search?: string; isActive?: boolean }): Promise<CustomerData[]> {
    let items = [...MEM_CUSTOMERS];
    if (params.isActive !== undefined) {
      items = items.filter(c => c.isActive === params.isActive);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      items = items.filter(
        c =>
          c.name.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      );
    }
    return items;
  }

  async findCustomerById(id: string): Promise<CustomerData | null> {
    const cust = MEM_CUSTOMERS.find(c => c.id === id);
    return cust || null;
  }

  async createCustomer(data: CreateCustomerInput): Promise<CustomerData> {
    const existing = MEM_CUSTOMERS.find(c => c.code.toLowerCase() === data.code.toLowerCase());
    if (existing) {
      throw new Error(`Customer with code '${data.code}' already exists`);
    }

    const now = new Date();
    const customer: CustomerData = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: data.code.toUpperCase(),
      name: data.name,
      contactName: data.contactName || null,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    MEM_CUSTOMERS.unshift(customer);
    return customer;
  }

  async updateCustomer(id: string, data: UpdateCustomerInput): Promise<CustomerData> {
    const customer = MEM_CUSTOMERS.find(c => c.id === id);
    if (!customer) throw new Error(`Customer '${id}' not found`);

    if (data.code && data.code !== customer.code) {
      const dup = MEM_CUSTOMERS.find(c => c.id !== id && c.code.toLowerCase() === data.code?.toLowerCase());
      if (dup) throw new Error(`Customer with code '${data.code}' already exists`);
      customer.code = data.code.toUpperCase();
    }

    if (data.name) customer.name = data.name;
    if (data.contactName !== undefined) customer.contactName = data.contactName;
    if (data.email) customer.email = data.email;
    if (data.phone) customer.phone = data.phone;
    if (data.address) customer.address = data.address;
    if (data.city) customer.city = data.city;
    if (data.country) customer.country = data.country;
    customer.updatedAt = new Date();

    return customer;
  }

  // ---------------------------------------------------------------------------
  // 2. CUSTOMER ORDERS CRUD & LIFECYCLE
  // ---------------------------------------------------------------------------
  async listOrders(params: {
    status?: string;
    customerId?: string;
    warehouseId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: CustomerOrderData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    let filtered = [...MEM_ORDERS];
    if (params.status) filtered = filtered.filter(o => o.status === params.status);
    if (params.customerId) filtered = filtered.filter(o => o.customerId === params.customerId);
    if (params.warehouseId) filtered = filtered.filter(o => o.warehouseId === params.warehouseId);
    if (params.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.orderNumber.toLowerCase().includes(term) ||
          (o.notes && o.notes.toLowerCase().includes(term))
      );
    }

    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const items = await Promise.all(paginated.map(o => hydrateOrder(o)));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOrderById(id: string): Promise<CustomerOrderData | null> {
    const order = MEM_ORDERS.find(o => o.id === id);
    if (!order) return null;
    return hydrateOrder(order);
  }

  async createOrder(data: CreateCustomerOrderInput, userId?: string): Promise<CustomerOrderData> {
    const customer = await this.findCustomerById(data.customerId);
    if (!customer) throw new Error(`Customer '${data.customerId}' not found`);

    const warehouse = await masterDataRepository.findWarehouseById(data.warehouseId);
    if (!warehouse) throw new Error(`Warehouse '${data.warehouseId}' not found`);

    let totalAmount = 0;
    const verifiedLines: any[] = [];

    for (const item of data.lineItems) {
      const product = await masterDataRepository.findProductById(item.productId);
      if (!product) throw new Error(`Product '${item.productId}' not found`);
      const price = item.unitPrice !== undefined ? item.unitPrice : product.sellingPrice;
      totalAmount += item.quantityOrdered * price;
      verifiedLines.push({
        ...item,
        unitPrice: price,
        product
      });
    }

    const now = new Date();
    const orderNumber = `SO-${now.getFullYear()}-${(MEM_ORDERS.length + 1)
      .toString()
      .padStart(4, '0')}`;

    const newOrder: CustomerOrderData = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      customerId: data.customerId,
      warehouseId: data.warehouseId,
      status: 'DRAFT',
      orderDate: now,
      requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
      shippingAddress: data.shippingAddress || customer.address,
      shippingCity: data.shippingCity || customer.city,
      shippingCountry: data.shippingCountry || customer.country,
      totalAmount: Math.round(totalAmount * 100) / 100,
      notes: data.notes || null,
      createdByUserId: userId || null,
      createdAt: now,
      updatedAt: now,
      lineItems: []
    };

    newOrder.lineItems = verifiedLines.map((l, idx) => ({
      id: `oli-${Date.now()}-${idx}`,
      orderId: newOrder.id,
      productId: l.productId,
      product: l.product,
      quantityOrdered: l.quantityOrdered,
      quantityReserved: 0,
      quantityPicked: 0,
      quantityPacked: 0,
      quantityDispatched: 0,
      unitPrice: l.unitPrice,
      createdAt: now,
      updatedAt: now
    }));

    MEM_ORDERS.unshift(newOrder);
    return hydrateOrder(newOrder);
  }

  // ---------------------------------------------------------------------------
  // 3. CONFIRM & ALLOCATE ORDER (RESERVE INVENTORY & GENERATE PICK TASKS)
  // ---------------------------------------------------------------------------
  async confirmAndAllocateOrder(id: string, userId?: string): Promise<CustomerOrderData> {
    const order = MEM_ORDERS.find(o => o.id === id);
    if (!order) throw new Error(`Customer order '${id}' not found`);

    if (order.status !== 'DRAFT') {
      throw new Error(`Cannot confirm order '${order.orderNumber}': Current status is already ${order.status}`);
    }

    // 1. Transactional Pre-flight: Check availability across all lines before reserving
    for (const line of order.lineItems) {
      const summary = await inventoryRepository.listInventory({
        warehouseId: order.warehouseId,
        productId: line.productId
      });
      const availableUnits = summary.items.reduce(
        (sum, item) => sum + Math.max(0, item.quantityOnHand - item.quantityReserved),
        0
      );

      if (availableUnits < line.quantityOrdered) {
        const prod = await masterDataRepository.findProductById(line.productId);
        throw new Error(
          `Insufficient available stock for SKU '${prod?.sku || line.productId}'. Ordered: ${
            line.quantityOrdered
          }, Available ATP: ${availableUnits}`
        );
      }
    }

    // 2. Reserve stock in inventory engine and generate location-based PickTasks
    const now = new Date();
    for (const line of order.lineItems) {
      const allocations = await inventoryRepository.reserveStock(
        order.warehouseId,
        line.productId,
        line.quantityOrdered
      );

      line.quantityReserved = line.quantityOrdered;
      line.updatedAt = now;

      // Create PickTask for each reserved bin
      for (const alloc of allocations) {
        const pickTask: PickTaskData = {
          id: `pick-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderId: order.id,
          orderLineItemId: line.id,
          productId: line.productId,
          locationId: alloc.locationId,
          quantityToPick: alloc.quantity,
          quantityPicked: 0,
          status: 'PENDING',
          pickSequence: alloc.pickSequence,
          createdAt: now
        };
        MEM_PICK_TASKS.push(pickTask);
      }
    }

    order.status = 'ALLOCATED';
    order.updatedAt = now;

    return hydrateOrder(order);
  }

  // ---------------------------------------------------------------------------
  // 4. CANCEL ORDER & RELEASE RESERVATIONS
  // ---------------------------------------------------------------------------
  async cancelOrder(id: string, reason?: string, userId?: string): Promise<CustomerOrderData> {
    const order = MEM_ORDERS.find(o => o.id === id);
    if (!order) throw new Error(`Customer order '${id}' not found`);

    if (order.status === 'DISPATCHED') {
      throw new Error(`Cannot cancel order '${order.orderNumber}': Order has already been dispatched`);
    }
    if (order.status === 'CANCELLED') {
      throw new Error(`Order '${order.orderNumber}' is already cancelled`);
    }

    const now = new Date();

    // Release any reserved inventory
    const orderPickTasks = MEM_PICK_TASKS.filter(t => t.orderId === order.id);
    for (const task of orderPickTasks) {
      if (task.status !== 'PICKED') {
        const unpickedReserved = task.quantityToPick - task.quantityPicked;
        if (unpickedReserved > 0) {
          await inventoryRepository.releaseReservedStock(
            order.warehouseId,
            task.productId,
            task.locationId,
            unpickedReserved
          );
        }
      }
      task.status = 'SHORT_PICKED';
      task.notes = `Cancelled: ${reason || 'Customer cancellation'}`;
    }

    for (const line of order.lineItems) {
      line.quantityReserved = 0;
      line.updatedAt = now;
    }

    order.status = 'CANCELLED';
    order.notes = order.notes
      ? `${order.notes} | Cancelled: ${reason || 'N/A'}`
      : `Cancelled: ${reason || 'N/A'}`;
    order.updatedAt = now;

    return hydrateOrder(order);
  }

  // ---------------------------------------------------------------------------
  // 5. PICKING WORKSTATION
  // ---------------------------------------------------------------------------
  async listPickTasks(params: {
    orderId?: string;
    warehouseId?: string;
    status?: string;
  }): Promise<PickTaskData[]> {
    let items = [...MEM_PICK_TASKS];
    if (params.orderId) items = items.filter(t => t.orderId === params.orderId);
    if (params.status) items = items.filter(t => t.status === params.status);

    // Sort by pickSequence asc (optimal walking sequence through warehouse aisles)
    items.sort((a, b) => a.pickSequence - b.pickSequence);
    return Promise.all(items.map(t => hydratePickTask(t)));
  }

  async confirmPickTask(
    id: string,
    quantityPicked: number,
    notes?: string,
    userId?: string
  ): Promise<{ task: PickTaskData; order: CustomerOrderData }> {
    const task = MEM_PICK_TASKS.find(t => t.id === id);
    if (!task) throw new Error(`Pick task '${id}' not found`);

    if (task.status === 'PICKED') {
      throw new Error(`Pick task '${id}' has already been completed`);
    }

    // Over-picking guard
    if (quantityPicked > task.quantityToPick) {
      throw new Error(
        `Over-picking blocked. Task quantity to pick: ${task.quantityToPick}, Attempted: ${quantityPicked}`
      );
    }

    const now = new Date();
    task.quantityPicked = quantityPicked;
    task.pickedByUserId = userId || null;
    task.pickedAt = now;
    task.notes = notes || null;
    task.status = quantityPicked >= task.quantityToPick ? 'PICKED' : 'SHORT_PICKED';

    // Update parent order and line item
    const order = MEM_ORDERS.find(o => o.id === task.orderId)!;
    const line = order.lineItems.find(l => l.id === task.orderLineItemId);
    if (line) {
      line.quantityPicked += quantityPicked;
      line.updatedAt = now;
    }

    // Evaluate order status
    const allOrderTasks = MEM_PICK_TASKS.filter(t => t.orderId === order.id);
    const allCompleted = allOrderTasks.every(t => t.status === 'PICKED' || t.status === 'SHORT_PICKED');
    order.status = allCompleted ? 'PICKED' : 'PICKING';
    order.updatedAt = now;

    const hydratedTask = await hydratePickTask(task);
    const hydratedOrder = await hydrateOrder(order);

    return { task: hydratedTask, order: hydratedOrder };
  }

  // ---------------------------------------------------------------------------
  // 6. PACKING CONFIRMATION
  // ---------------------------------------------------------------------------
  async confirmPacking(
    orderId: string,
    packageNotes?: string,
    userId?: string
  ): Promise<CustomerOrderData> {
    const order = MEM_ORDERS.find(o => o.id === orderId);
    if (!order) throw new Error(`Customer order '${orderId}' not found`);

    if (order.status !== 'PICKED') {
      throw new Error(
        `Cannot pack order '${order.orderNumber}': Order must be in PICKED status (current: ${order.status})`
      );
    }

    const now = new Date();
    for (const line of order.lineItems) {
      line.quantityPacked = line.quantityPicked;
      line.updatedAt = now;
    }

    order.status = 'PACKED';
    if (packageNotes) {
      order.notes = order.notes ? `${order.notes} | Packing: ${packageNotes}` : packageNotes;
    }
    order.updatedAt = now;

    return hydrateOrder(order);
  }

  // ---------------------------------------------------------------------------
  // 7. DISPATCH CONFIRMATION (DEDUCT PHYSICAL ON-HAND STOCK EXACTLY ONCE)
  // ---------------------------------------------------------------------------
  async confirmDispatch(
    data: ConfirmDispatchInput & { orderId: string },
    userId?: string
  ): Promise<{
    shipment: ShipmentData;
    order: CustomerOrderData;
    movements: any[];
  }> {
    const order = MEM_ORDERS.find(o => o.id === data.orderId);
    if (!order) throw new Error(`Customer order '${data.orderId}' not found`);

    if (order.status === 'DISPATCHED') {
      throw new Error(`Order '${order.orderNumber}' has already been dispatched. Duplicate dispatch blocked.`);
    }

    if (order.status !== 'PACKED' && order.status !== 'PICKED') {
      throw new Error(
        `Cannot dispatch order '${order.orderNumber}': Order must be PACKED or PICKED first (current: ${order.status})`
      );
    }

    const now = new Date();
    const dispatchNumber = `DSP-${now.getFullYear()}-${(MEM_SHIPMENTS.length + 1)
      .toString()
      .padStart(4, '0')}`;

    const movements: any[] = [];
    const orderTasks = MEM_PICK_TASKS.filter(t => t.orderId === order.id && t.quantityPicked > 0);

    // DEDUCT PHYSICAL ON-HAND STOCK EXACTLY ONCE FROM THE EXACT STORAGE BINS
    for (const task of orderTasks) {
      const movement = await inventoryRepository.dispatchReservedStock(
        order.warehouseId,
        task.productId,
        task.locationId,
        task.quantityPicked,
        dispatchNumber,
        userId
      );
      movements.push(movement);

      const line = order.lineItems.find(l => l.id === task.orderLineItemId);
      if (line) {
        line.quantityDispatched += task.quantityPicked;
        line.quantityReserved = Math.max(0, line.quantityReserved - task.quantityPicked);
        line.updatedAt = now;
      }
    }

    const shipment: ShipmentData = {
      id: `shp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dispatchNumber,
      orderId: order.id,
      warehouseId: order.warehouseId,
      carrierName: data.carrierName,
      trackingNumber: data.trackingNumber || null,
      shippingMethod: data.shippingMethod || 'Standard Ground',
      dispatchedAt: now,
      dispatchedByUserId: userId || null,
      notes: data.notes || null,
      createdAt: now
    };

    MEM_SHIPMENTS.unshift(shipment);
    order.status = 'DISPATCHED';
    order.updatedAt = now;

    const hydratedOrder = await hydrateOrder(order);
    const { shipments: _s, ...cleanOrder } = hydratedOrder;
    shipment.order = cleanOrder as CustomerOrderData;

    return {
      shipment,
      order: hydratedOrder,
      movements
    };
  }

  // ---------------------------------------------------------------------------
  // 8. SHIPMENTS HISTORY
  // ---------------------------------------------------------------------------
  async listShipments(params: {
    orderId?: string;
    warehouseId?: string;
    limit?: number;
  }): Promise<ShipmentData[]> {
    let items = [...MEM_SHIPMENTS];
    if (params.orderId) items = items.filter(s => s.orderId === params.orderId);
    if (params.warehouseId) items = items.filter(s => s.warehouseId === params.warehouseId);

    items.sort((a, b) => b.dispatchedAt.getTime() - a.dispatchedAt.getTime());
    const limit = params.limit || 50;
    return items.slice(0, limit).map(s => {
      const order = MEM_ORDERS.find(o => o.id === s.orderId);
      const { order: _o, ...rest } = s;
      return {
        ...rest,
        order: order ? ({ id: order.id, orderNumber: order.orderNumber, status: order.status } as any) : undefined
      };
    });
  }
}

export const fulfillmentRepository = new FulfillmentRepository();
