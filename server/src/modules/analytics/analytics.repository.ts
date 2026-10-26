import { prisma } from '../../config/prisma.js';
import {
  DashboardMetrics,
  ReportType,
  ReportQueryParams,
  ReportResult,
  AuditLogQueryParams,
  AuditLogItem
} from './analytics.types.js';
import { masterDataRepository } from '../masterData/masterData.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { purchasingRepository } from '../purchasing/purchasing.repository.js';
import { fulfillmentRepository } from '../fulfillment/fulfillment.repository.js';
import { authRepository } from '../auth/auth.repository.js';

export class AnalyticsRepository {
  // ---------------------------------------------------------------------------
  // 1. DASHBOARD ANALYTICS & REAL-TIME OPERATIONAL METRICS
  // ---------------------------------------------------------------------------
  async getDashboardMetrics(warehouseId?: string): Promise<DashboardMetrics> {
    const now = new Date();

    // 1. Query Master Products & Warehouses
    const [productsRes, warehouses] = await Promise.all([
      masterDataRepository.listProducts({ limit: 1000 }),
      masterDataRepository.listWarehouses()
    ]);
    const allProducts = productsRes.items || [];
    const activeProducts = allProducts.filter(p => p.isActive);

    const targetWarehouse = warehouseId
      ? warehouses.find(w => w.id === warehouseId || w.code === warehouseId)
      : undefined;

    // 2. Query Real Inventory Balances & Valuations
    const [inventoryRes, valuationRes] = await Promise.all([
      inventoryRepository.listInventory({ warehouseId, limit: 5000 }),
      inventoryRepository.getValuationReport()
    ]);
    const invItems = inventoryRes.items || [];

    const totalStockOnHand = invItems.reduce((sum, item) => sum + item.quantityOnHand, 0);
    const totalStockReserved = invItems.reduce((sum, item) => sum + item.quantityReserved, 0);
    const totalStockAvailable = invItems.reduce(
      (sum, item) => sum + Math.max(0, item.quantityOnHand - item.quantityReserved),
      0
    );
    const totalInventoryValuation = valuationRes.totalInventoryValue;

    // Calculate product-level low-stock and stockout counts
    const productOnHandMap = new Map<string, number>();
    for (const item of invItems) {
      productOnHandMap.set(
        item.productId,
        (productOnHandMap.get(item.productId) || 0) + item.quantityOnHand
      );
    }

    let lowStockItemCount = 0;
    let outOfStockItemCount = 0;

    for (const prod of activeProducts) {
      const onHand = productOnHandMap.get(prod.id) ?? 0;
      if (onHand === 0) {
        outOfStockItemCount++;
      } else if (onHand <= prod.reorderPoint) {
        lowStockItemCount++;
      }
    }

    // 3. Query Inbound Purchasing & Receipts
    const [poRes, grnList] = await Promise.all([
      purchasingRepository.listPurchaseOrders({ warehouseId, limit: 1000 }),
      purchasingRepository.listGoodsReceipts({ warehouseId, limit: 1000 })
    ]);
    const pos = poRes.items || [];

    const draftPOs = pos.filter(p => p.status === 'DRAFT').length;
    const submittedPOs = pos.filter(p => p.status === 'SUBMITTED').length;
    const partiallyReceivedPOs = pos.filter(p => p.status === 'PARTIALLY_RECEIVED').length;
    const fullyReceivedPOs = pos.filter(p => p.status === 'FULLY_RECEIVED').length;
    const pendingPurchaseOrdersCount = draftPOs + submittedPOs + partiallyReceivedPOs;

    // 4. Query Customer Orders & Fulfillment
    const [ordersRes, shipmentsList] = await Promise.all([
      fulfillmentRepository.listOrders({ warehouseId, limit: 1000 }),
      fulfillmentRepository.listShipments({ warehouseId, limit: 1000 })
    ]);
    const orders = ordersRes.items || [];

    const draftOrders = orders.filter(o => o.status === 'DRAFT').length;
    const allocatedOrders = orders.filter(o => o.status === 'ALLOCATED').length;
    const pickingOrders = orders.filter(o => o.status === 'PICKING').length;
    const pickedOrders = orders.filter(o => o.status === 'PICKED').length;
    const packedOrders = orders.filter(o => o.status === 'PACKED').length;
    const dispatchedOrders = orders.filter(o => o.status === 'DISPATCHED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    const pendingCustomerOrdersCount =
      draftOrders + allocatedOrders + pickingOrders + pickedOrders + packedOrders;

    // 5. Query Dispatch Statistics
    const todayStr = now.toDateString();
    let shipmentsToday = 0;
    const carrierBreakdown: Record<string, number> = {};

    for (const shp of shipmentsList) {
      if (new Date(shp.dispatchedAt).toDateString() === todayStr) {
        shipmentsToday++;
      }
      const carrier = shp.carrierName || 'Standard';
      carrierBreakdown[carrier] = (carrierBreakdown[carrier] || 0) + 1;
    }

    // 6. Movement Trends (Last 7 Days)
    const movements = await inventoryRepository.listStockMovements({
      warehouseId,
      limit: 1000
    });

    const daysMap = new Map<string, { inbound: number; outbound: number; adjustments: number; total: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      daysMap.set(dateKey, { inbound: 0, outbound: 0, adjustments: 0, total: 0 });
    }

    for (const m of movements) {
      const mDateKey = new Date(m.createdAt).toISOString().split('T')[0];
      if (daysMap.has(mDateKey)) {
        const stats = daysMap.get(mDateKey)!;
        const qty = m.quantity || 0;
        if (m.movementType === 'STOCK_IN') {
          stats.inbound += qty;
        } else if (m.movementType === 'STOCK_OUT') {
          stats.outbound += qty;
        } else {
          stats.adjustments += qty;
        }
        stats.total += qty;
      }
    }

    const movementsTrend = Array.from(daysMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));

    // 7. Order Status Distribution
    const orderStatusDistribution = [
      { status: 'DRAFT', count: draftOrders, label: 'Draft' },
      { status: 'ALLOCATED', count: allocatedOrders, label: 'Allocated' },
      { status: 'PICKING', count: pickingOrders, label: 'Picking' },
      { status: 'PICKED', count: pickedOrders, label: 'Picked' },
      { status: 'PACKED', count: packedOrders, label: 'Packed' },
      { status: 'DISPATCHED', count: dispatchedOrders, label: 'Dispatched' },
      { status: 'CANCELLED', count: cancelledOrders, label: 'Cancelled' }
    ];

    // 8. Warehouse Distribution
    const warehouseDistribution = await Promise.all(
      warehouses.map(async w => {
        const whInv = await inventoryRepository.listInventory({ warehouseId: w.id, limit: 1000 });
        const whOnHand = whInv.items.reduce((sum, i) => sum + i.quantityOnHand, 0);
        const whVal = whInv.items.reduce(
          (sum, i) => sum + i.quantityOnHand * (i.product?.costPrice || 0),
          0
        );
        return {
          warehouseId: w.id,
          warehouseCode: w.code,
          warehouseName: w.name,
          productCount: new Set(whInv.items.map(i => i.productId)).size,
          totalOnHand: whOnHand,
          valuation: Math.round(whVal * 100) / 100
        };
      })
    );

    // 9. Top Moving Products
    const productDispatchCount = new Map<string, number>();
    for (const m of movements) {
      if (m.movementType === 'STOCK_OUT') {
        productDispatchCount.set(
          m.productId,
          (productDispatchCount.get(m.productId) || 0) + m.quantity
        );
      }
    }

    const topMovingProducts = Array.from(productDispatchCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, totalDispatched]) => {
        const prod = allProducts.find(p => p.id === productId);
        return {
          productId,
          sku: prod?.sku || productId,
          name: prod?.name || 'Unknown Product',
          totalDispatched,
          unitPrice: prod?.sellingPrice || prod?.costPrice
        };
      });

    // 10. Recent Activity Audit Logs
    const auditLogsRaw = await authRepository.listAuditLogs(10);
    const users = await authRepository.listUsers();
    const recentActivity = auditLogsRaw.map(log => {
      const u = users.find(user => user.id === log.userId);
      return {
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        user: u
          ? {
              id: u.id,
              name: `${u.firstName} ${u.lastName}`.trim(),
              email: u.email,
              role: u.role
            }
          : null,
        createdAt: new Date(log.createdAt).toISOString()
      };
    });

    return {
      timestamp: now.toISOString(),
      warehouseId: targetWarehouse?.id,
      warehouseName: targetWarehouse?.name,
      summary: {
        totalProducts: allProducts.length,
        activeProducts: activeProducts.length,
        totalStockOnHand,
        totalStockReserved,
        totalStockAvailable,
        totalInventoryValuation,
        lowStockItemCount,
        outOfStockItemCount,
        pendingPurchaseOrdersCount,
        pendingCustomerOrdersCount,
        totalShipmentsDispatched: shipmentsList.length
      },
      inboundStats: {
        totalPOs: pos.length,
        draftPOs,
        submittedPOs,
        partiallyReceivedPOs,
        fullyReceivedPOs,
        totalReceiptsCount: grnList.length
      },
      fulfillmentStats: {
        totalOrders: orders.length,
        draftOrders,
        allocatedOrders,
        pickingOrders,
        pickedOrders,
        packedOrders,
        dispatchedOrders,
        cancelledOrders
      },
      dispatchStats: {
        totalShipments: shipmentsList.length,
        shipmentsToday,
        carrierBreakdown
      },
      charts: {
        movementsTrend,
        orderStatusDistribution,
        warehouseDistribution,
        topMovingProducts
      },
      recentActivity
    };
  }

  // ---------------------------------------------------------------------------
  // 2. REPORTS ENGINE GENERATOR
  // ---------------------------------------------------------------------------
  async getReportData(reportType: ReportType, params: ReportQueryParams): Promise<ReportResult> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const now = new Date();

    const [warehouses, productsRes, categories] = await Promise.all([
      masterDataRepository.listWarehouses(),
      masterDataRepository.listProducts({ limit: 1000 }),
      masterDataRepository.listCategories()
    ]);
    const products = productsRes.items || [];

    switch (reportType) {
      // -----------------------------------------------------------------------
      // REPORT: CURRENT INVENTORY
      // -----------------------------------------------------------------------
      case 'inventory': {
        const invRes = await inventoryRepository.listInventory({
          warehouseId: params.warehouseId,
          productId: params.productId,
          search: params.search,
          limit: 5000
        });

        let allItems = invRes.items.map(item => {
          const prod = products.find(p => p.id === item.productId);
          const wh = warehouses.find(w => w.id === item.warehouseId);
          const cat = categories.find(c => c.id === prod?.categoryId);
          const unitCost = prod?.costPrice || 0;
          const available = Math.max(0, item.quantityOnHand - item.quantityReserved);
          const totalValuation = item.quantityOnHand * unitCost;

          return {
            id: item.id,
            sku: prod?.sku || 'N/A',
            productName: prod?.name || 'N/A',
            categoryName: cat?.name || 'General',
            warehouseCode: wh?.code || 'N/A',
            warehouseName: wh?.name || item.warehouseId,
            locationBarcode: item.location?.barcode || item.locationId,
            quantityOnHand: item.quantityOnHand,
            quantityReserved: item.quantityReserved,
            quantityAvailable: available,
            unitOfMeasure: prod?.uom || 'UNIT',
            unitCost,
            totalValuation,
            updatedAt: item.updatedAt
          };
        });

        if (params.search) {
          const s = params.search.toLowerCase();
          allItems = allItems.filter(
            i =>
              i.sku.toLowerCase().includes(s) ||
              i.productName.toLowerCase().includes(s) ||
              i.locationBarcode.toLowerCase().includes(s)
          );
        }

        const totalOnHand = allItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
        const totalReserved = allItems.reduce((acc, i) => acc + i.quantityReserved, 0);
        const totalAvailable = allItems.reduce((acc, i) => acc + i.quantityAvailable, 0);
        const totalValuation = allItems.reduce((acc, i) => acc + i.totalValuation, 0);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'inventory',
          title: 'Current Inventory & Asset Balances Report',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalLines: total,
            totalOnHand,
            totalReserved,
            totalAvailable,
            totalValuation: Math.round(totalValuation * 100) / 100
          },
          items: paginated
        };
      }

      // -----------------------------------------------------------------------
      // REPORT: STOCK MOVEMENTS
      // -----------------------------------------------------------------------
      case 'stock-movements': {
        const movList = await inventoryRepository.listStockMovements({
          warehouseId: params.warehouseId,
          productId: params.productId,
          movementType: params.status,
          limit: 5000
        });

        const users = await authRepository.listUsers();
        let allItems = movList.map(m => {
          const prod = products.find(p => p.id === m.productId);
          const wh = warehouses.find(w => w.id === m.warehouseId);
          const u = users.find(user => user.id === (m as any).userId || user.id === m.performedByUserId);

          return {
            id: m.id,
            timestamp: m.createdAt,
            sku: prod?.sku || 'N/A',
            productName: prod?.name || 'N/A',
            warehouseName: wh?.name || m.warehouseId,
            movementType: m.movementType,
            quantity: m.quantity,
            fromLocation: (m as any).fromLocationId || m.sourceLocationId || 'N/A',
            toLocation: (m as any).toLocationId || m.destLocationId || 'N/A',
            referenceId: m.referenceId || 'N/A',
            user: u ? `${u.firstName} ${u.lastName}`.trim() : (m.performedByUserId || (m as any).userId || 'System'),
            balanceAfter: null,
            notes: m.notes || ''
          };
        });

        if (params.search) {
          const s = params.search.toLowerCase();
          allItems = allItems.filter(
            i =>
              i.sku.toLowerCase().includes(s) ||
              i.productName.toLowerCase().includes(s) ||
              i.referenceId.toLowerCase().includes(s)
          );
        }

        const totalQty = allItems.reduce((acc, m) => acc + m.quantity, 0);
        const inboundQty = allItems
          .filter(m => m.movementType === 'STOCK_IN')
          .reduce((acc, m) => acc + m.quantity, 0);
        const outboundQty = allItems
          .filter(m => m.movementType === 'STOCK_OUT')
          .reduce((acc, m) => acc + m.quantity, 0);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'stock-movements',
          title: 'Stock Movements & Transaction Audit Ledger',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalTransactions: total,
            totalQuantityMoved: totalQty,
            totalInboundQuantity: inboundQty,
            totalOutboundQuantity: outboundQty
          },
          items: paginated
        };
      }

      // -----------------------------------------------------------------------
      // REPORT: WAREHOUSE LOCATIONS & BIN OCCUPANCY
      // -----------------------------------------------------------------------
      case 'locations': {
        const whId = params.warehouseId || warehouses[0]?.id || 'wh-01';
        const locRes = await masterDataRepository.listLocations({
          warehouseId: whId,
          limit: 1000
        });
        const invRes = await inventoryRepository.listInventory({
          warehouseId: whId,
          limit: 5000
        });

        const locationQtyMap = new Map<string, { count: number; totalQty: number }>();
        for (const item of invRes.items) {
          const existing = locationQtyMap.get(item.locationId) || { count: 0, totalQty: 0 };
          existing.count += 1;
          existing.totalQty += item.quantityOnHand;
          locationQtyMap.set(item.locationId, existing);
        }

        let allItems = locRes.items.map(loc => {
          const wh = warehouses.find(w => w.id === loc.warehouseId);
          const occupancy = locationQtyMap.get(loc.id) || { count: 0, totalQty: 0 };

          return {
            id: loc.id,
            warehouseCode: wh?.code || 'N/A',
            warehouseName: wh?.name || loc.warehouseId,
            zone: loc.zone?.code || 'N/A',
            barcode: loc.barcode,
            aisle: loc.aisle,
            rack: loc.rack,
            shelf: loc.shelf,
            bin: loc.bin,
            isLocked: loc.isLocked,
            storedProductCount: occupancy.count,
            totalQuantityOnHand: occupancy.totalQty,
            status: loc.isLocked ? 'LOCKED' : occupancy.totalQty > 0 ? 'OCCUPIED' : 'EMPTY'
          };
        });

        if (params.search) {
          const s = params.search.toLowerCase();
          allItems = allItems.filter(
            i =>
              i.barcode.toLowerCase().includes(s) ||
              i.zone.toLowerCase().includes(s) ||
              i.status.toLowerCase().includes(s)
          );
        }

        const totalLocations = allItems.length;
        const occupiedCount = allItems.filter(l => l.status === 'OCCUPIED').length;
        const emptyCount = allItems.filter(l => l.status === 'EMPTY').length;
        const lockedCount = allItems.filter(l => l.isLocked).length;

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'locations',
          title: 'Warehouse Locations & Volumetric Storage Report',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalLocations,
            occupiedLocations: occupiedCount,
            emptyLocations: emptyCount,
            lockedLocations: lockedCount,
            occupancyRatePercent: totalLocations > 0 ? Math.round((occupiedCount / totalLocations) * 100) : 0
          },
          items: paginated
        };
      }

      // -----------------------------------------------------------------------
      // REPORT: INBOUND GOODS RECEIVING (GRN)
      // -----------------------------------------------------------------------
      case 'receiving': {
        const grnRes = await purchasingRepository.listGoodsReceipts({
          warehouseId: params.warehouseId,
          limit: 1000
        });

        const users = await authRepository.listUsers();
        let allItems = grnRes.map(grn => {
          const wh = warehouses.find(w => w.id === grn.warehouseId);
          const u = users.find(user => user.id === grn.receivedByUserId);

          const totalReceived = grn.items.reduce((s, i) => s + i.quantityReceived, 0);
          const totalAccepted = grn.items.reduce((s, i) => s + i.quantityAccepted, 0);
          const totalRejected = grn.items.reduce((s, i) => s + i.quantityRejected, 0);

          return {
            id: grn.id,
            receiptNumber: grn.receiptNumber,
            poNumber: grn.purchaseOrder?.poNumber || 'N/A',
            supplierName: grn.purchaseOrder?.supplier?.name || 'N/A',
            warehouseName: wh?.name || grn.warehouseId,
            carrierName: grn.carrierName || 'Direct Delivery',
            trackingNumber: grn.trackingNumber || 'N/A',
            receivedAt: grn.receivedAt,
            receivedBy: u ? `${u.firstName} ${u.lastName}`.trim() : 'Warehouse Staff',
            itemsCount: grn.items.length,
            totalReceived,
            totalAccepted,
            totalRejected,
            status: totalRejected > 0 ? 'PARTIAL_REJECTION' : 'ACCEPTED'
          };
        });

        if (params.startDate) {
          const start = new Date(params.startDate);
          allItems = allItems.filter(i => new Date(i.receivedAt) >= start);
        }
        if (params.endDate) {
          const end = new Date(params.endDate);
          allItems = allItems.filter(i => new Date(i.receivedAt) <= end);
        }
        if (params.search) {
          const s = params.search.toLowerCase();
          allItems = allItems.filter(
            i =>
              i.receiptNumber.toLowerCase().includes(s) ||
              i.poNumber.toLowerCase().includes(s) ||
              i.supplierName.toLowerCase().includes(s)
          );
        }

        const totalAccepted = allItems.reduce((acc, i) => acc + i.totalAccepted, 0);
        const totalRejected = allItems.reduce((acc, i) => acc + i.totalRejected, 0);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'receiving',
          title: 'Inbound Goods Receiving (GRN) History Report',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalReceipts: total,
            totalUnitsAccepted: totalAccepted,
            totalUnitsRejected: totalRejected,
            acceptanceRatePercent:
              totalAccepted + totalRejected > 0
                ? Math.round((totalAccepted / (totalAccepted + totalRejected)) * 100)
                : 100
          },
          items: paginated
        };
      }

      // -----------------------------------------------------------------------
      // REPORT: CUSTOMER SALES ORDERS
      // -----------------------------------------------------------------------
      case 'orders': {
        const ordersRes = await fulfillmentRepository.listOrders({
          warehouseId: params.warehouseId,
          status: params.status,
          search: params.search,
          limit: 1000
        });

        let allItems = ordersRes.items.map(order => {
          const wh = warehouses.find(w => w.id === order.warehouseId);
          const totalUnitsOrdered = order.lineItems.reduce((s, l) => s + l.quantityOrdered, 0);
          const totalUnitsDispatched = order.lineItems.reduce((s, l) => s + l.quantityDispatched, 0);

          return {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customer?.name || 'N/A',
            customerCode: order.customer?.code || 'N/A',
            warehouseName: wh?.name || order.warehouseId,
            orderDate: order.orderDate,
            status: order.status,
            totalLines: order.lineItems.length,
            totalUnitsOrdered,
            totalUnitsDispatched,
            totalAmount: Number(order.totalAmount),
            shippingCity: order.shippingCity || 'N/A'
          };
        });

        if (params.startDate) {
          const start = new Date(params.startDate);
          allItems = allItems.filter(i => new Date(i.orderDate) >= start);
        }
        if (params.endDate) {
          const end = new Date(params.endDate);
          allItems = allItems.filter(i => new Date(i.orderDate) <= end);
        }

        const totalAmount = allItems.reduce((acc, o) => acc + o.totalAmount, 0);
        const totalUnits = allItems.reduce((acc, o) => acc + o.totalUnitsOrdered, 0);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'orders',
          title: 'Customer Sales Orders & Fulfillment Status Report',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalOrders: total,
            totalUnitsOrdered: totalUnits,
            totalFinancialAmount: Math.round(totalAmount * 100) / 100
          },
          items: paginated
        };
      }

      // -----------------------------------------------------------------------
      // REPORT: OUTBOUND DISPATCH & SHIPMENTS
      // -----------------------------------------------------------------------
      case 'dispatch': {
        const shipmentsRes = await fulfillmentRepository.listShipments({
          warehouseId: params.warehouseId,
          limit: 1000
        });

        const users = await authRepository.listUsers();
        let allItems = shipmentsRes.map(shp => {
          const wh = warehouses.find(w => w.id === shp.warehouseId);
          const u = users.find(user => user.id === shp.dispatchedByUserId);

          return {
            id: shp.id,
            dispatchNumber: shp.dispatchNumber,
            orderNumber: shp.order?.orderNumber || shp.orderId,
            customerName: shp.order?.customer?.name || 'Customer Account',
            carrierName: shp.carrierName,
            trackingNumber: shp.trackingNumber || 'N/A',
            shippingMethod: shp.shippingMethod || 'Standard',
            warehouseName: wh?.name || shp.warehouseId,
            dispatchedAt: shp.dispatchedAt,
            dispatchedBy: u ? `${u.firstName} ${u.lastName}`.trim() : 'Warehouse Dispatcher',
            status: 'COMPLETED'
          };
        });

        if (params.startDate) {
          const start = new Date(params.startDate);
          allItems = allItems.filter(i => new Date(i.dispatchedAt) >= start);
        }
        if (params.endDate) {
          const end = new Date(params.endDate);
          allItems = allItems.filter(i => new Date(i.dispatchedAt) <= end);
        }
        if (params.search) {
          const s = params.search.toLowerCase();
          allItems = allItems.filter(
            i =>
              i.dispatchNumber.toLowerCase().includes(s) ||
              i.orderNumber.toLowerCase().includes(s) ||
              i.carrierName.toLowerCase().includes(s) ||
              i.trackingNumber.toLowerCase().includes(s)
          );
        }

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'dispatch',
          title: 'Outbound Dispatch & Carrier Manifests Report',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalShipments: total
          },
          items: paginated
        };
      }

      // -----------------------------------------------------------------------
      // REPORT: LOW-STOCK & SHORTFALL ALERTS
      // -----------------------------------------------------------------------
      case 'low-stock': {
        const invRes = await inventoryRepository.listInventory({
          warehouseId: params.warehouseId,
          limit: 5000
        });
        const suppliers = await masterDataRepository.listSuppliers({});

        const productStockMap = new Map<string, { onHand: number; reserved: number }>();
        for (const item of invRes.items) {
          const prev = productStockMap.get(item.productId) || { onHand: 0, reserved: 0 };
          prev.onHand += item.quantityOnHand;
          prev.reserved += item.quantityReserved;
          productStockMap.set(item.productId, prev);
        }

        const lowStockItems: any[] = [];
        for (const prod of products.filter(p => p.isActive)) {
          const stock = productStockMap.get(prod.id) || { onHand: 0, reserved: 0 };
          if (stock.onHand <= prod.reorderPoint) {
            const cat = categories.find(c => c.id === prod.categoryId);
            const sup = suppliers.find(s => s.id === (prod as any).supplierId);
            const shortfall = Math.max(0, prod.reorderPoint - stock.onHand);
            const estReplenishCost = shortfall * (prod.costPrice || 0);

            lowStockItems.push({
              id: prod.id,
              sku: prod.sku,
              productName: prod.name,
              categoryName: cat?.name || 'General',
              reorderPoint: prod.reorderPoint,
              quantityOnHand: stock.onHand,
              quantityReserved: stock.reserved,
              quantityAvailable: Math.max(0, stock.onHand - stock.reserved),
              shortfallQuantity: shortfall,
              unitCost: prod.costPrice,
              estimatedReplenishCost: estReplenishCost,
              suggestedSupplier: sup?.name || 'Primary Supplier',
              urgency: stock.onHand === 0 ? 'CRITICAL_STOCKOUT' : 'LOW_STOCK'
            });
          }
        }

        let allItems = lowStockItems.sort((a, b) => {
          if (a.urgency === 'CRITICAL_STOCKOUT' && b.urgency !== 'CRITICAL_STOCKOUT') return -1;
          if (b.urgency === 'CRITICAL_STOCKOUT' && a.urgency !== 'CRITICAL_STOCKOUT') return 1;
          return b.shortfallQuantity - a.shortfallQuantity;
        });

        if (params.search) {
          const s = params.search.toLowerCase();
          allItems = allItems.filter(
            i =>
              i.sku.toLowerCase().includes(s) ||
              i.productName.toLowerCase().includes(s) ||
              i.categoryName.toLowerCase().includes(s)
          );
        }

        const totalCritical = allItems.filter(i => i.urgency === 'CRITICAL_STOCKOUT').length;
        const totalEstimatedBudget = allItems.reduce((acc, i) => acc + i.estimatedReplenishCost, 0);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'low-stock',
          title: 'Low-Stock & Safety Stockout Shortfall Report',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalAlerts: total,
            criticalStockouts: totalCritical,
            estimatedReplenishBudget: Math.round(totalEstimatedBudget * 100) / 100
          },
          items: paginated
        };
      }

      // -----------------------------------------------------------------------
      // REPORT: INVENTORY VALUATION
      // -----------------------------------------------------------------------
      case 'valuation': {
        const valRes = await inventoryRepository.getValuationReport();

        let allItems = valRes.items.map(item => {
          const prod = products.find(p => p.sku === item.sku || p.id === item.productId);
          const cat = categories.find(c => c.id === prod?.categoryId);
          const totalValuation = item.totalValue;
          const sharePercent =
            valRes.totalInventoryValue > 0
              ? Math.round((totalValuation / valRes.totalInventoryValue) * 1000) / 10
              : 0;

          return {
            productId: item.productId,
            sku: item.sku,
            productName: item.name,
            categoryName: cat?.name || item.category || 'General Inventory',
            quantityOnHand: item.onHand,
            unitCost: item.unitCost,
            totalValuation: Math.round(totalValuation * 100) / 100,
            assetSharePercent: sharePercent,
            costingMethod: 'FIFO / Standard Cost'
          };
        });

        if (params.search) {
          const s = params.search.toLowerCase();
          allItems = allItems.filter(
            i =>
              i.sku.toLowerCase().includes(s) ||
              i.productName.toLowerCase().includes(s) ||
              i.categoryName.toLowerCase().includes(s)
          );
        }

        const totalUnits = allItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
        const totalValuation = allItems.reduce((acc, i) => acc + i.totalValuation, 0);

        const total = allItems.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allItems.slice((page - 1) * limit, page * limit);

        return {
          reportType: 'valuation',
          title: 'Inventory Asset Valuation & Costing Report',
          generatedAt: now.toISOString(),
          page,
          limit,
          total,
          totalPages,
          summary: {
            totalValuedSKUs: total,
            totalInventoryUnits: totalUnits,
            grandValuationTotal: Math.round(totalValuation * 100) / 100,
            costingMethodology: 'FIFO & Moving Weighted Average'
          },
          items: paginated
        };
      }

      default:
        throw new Error(`Unsupported report type: '${reportType}'`);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. AUDIT LOGS QUERY & SECURITY ENFORCEMENT
  // ---------------------------------------------------------------------------
  async getAuditLogs(params: AuditLogQueryParams): Promise<{
    items: AuditLogItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 50;

    const [logsRaw, users] = await Promise.all([
      authRepository.listAuditLogs(1000),
      authRepository.listUsers()
    ]);

    let filtered = [...logsRaw];

    if (params.action) {
      filtered = filtered.filter(l => l.action.toLowerCase() === params.action!.toLowerCase());
    }
    if (params.entity) {
      filtered = filtered.filter(l => l.entity.toLowerCase() === params.entity!.toLowerCase());
    }
    if (params.userId) {
      filtered = filtered.filter(l => l.userId === params.userId);
    }
    if (params.startDate) {
      const start = new Date(params.startDate);
      filtered = filtered.filter(l => new Date(l.createdAt) >= start);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      filtered = filtered.filter(l => new Date(l.createdAt) <= end);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(
        l =>
          l.action.toLowerCase().includes(s) ||
          l.entity.toLowerCase().includes(s) ||
          (l.details && l.details.toLowerCase().includes(s))
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const items: AuditLogItem[] = paginated.map(log => {
      const u = users.find(user => user.id === log.userId);

      // Extract before / after if present in details
      let before: any = null;
      let after: any = null;
      let cleanDetails = log.details || '';

      if (cleanDetails.includes('->')) {
        const parts = cleanDetails.split('->');
        before = { state: parts[0].trim() };
        after = { state: parts[1].trim() };
      }

      // STRICT SECURITY: Never expose secrets, hashes, or passwords in audit logs
      if (cleanDetails) {
        cleanDetails = cleanDetails
          .replace(/password[:=]\s*\S+/gi, 'password=[REDACTED]')
          .replace(/token[:=]\s*\S+/gi, 'token=[REDACTED]')
          .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, '[HASH_REDACTED]');
      }

      return {
        id: log.id,
        userId: log.userId,
        user: u
          ? {
              id: u.id,
              name: `${u.firstName} ${u.lastName}`.trim(),
              email: u.email,
              role: u.role
            }
          : null,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: cleanDetails,
        before,
        after,
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null,
        createdAt: new Date(log.createdAt).toISOString()
      };
    });

    return {
      items,
      total,
      page,
      totalPages
    };
  }

  // ---------------------------------------------------------------------------
  // 4. CSV EXPORT GENERATOR
  // ---------------------------------------------------------------------------
  async generateCsv(reportType: ReportType, params: ReportQueryParams): Promise<{
    filename: string;
    csv: string;
  }> {
    // Fetch all records for the export (up to 5,000)
    const report = await this.getReportData(reportType, {
      ...params,
      page: 1,
      limit: 5000
    });

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportType) {
      case 'inventory':
        headers = [
          'SKU',
          'Product Name',
          'Category',
          'Warehouse',
          'Location Barcode',
          'On-Hand Qty',
          'Reserved Qty',
          'Available ATP',
          'Unit of Measure',
          'Unit Cost ($)',
          'Valuation ($)'
        ];
        rows = report.items.map((i: any) => [
          i.sku,
          i.productName,
          i.categoryName,
          i.warehouseName,
          i.locationBarcode,
          i.quantityOnHand,
          i.quantityReserved,
          i.quantityAvailable,
          i.unitOfMeasure,
          i.unitCost.toFixed(2),
          i.totalValuation.toFixed(2)
        ]);
        break;

      case 'stock-movements':
        headers = [
          'Timestamp',
          'SKU',
          'Product Name',
          'Warehouse',
          'Movement Type',
          'Quantity',
          'From Location',
          'To Location',
          'Reference ID',
          'Responsible User'
        ];
        rows = report.items.map((m: any) => [
          new Date(m.timestamp).toISOString(),
          m.sku,
          m.productName,
          m.warehouseName,
          m.movementType,
          m.quantity,
          m.fromLocation,
          m.toLocation,
          m.referenceId,
          m.user
        ]);
        break;

      case 'locations':
        headers = [
          'Warehouse',
          'Zone',
          'Barcode',
          'Aisle',
          'Rack',
          'Shelf',
          'Bin',
          'Status',
          'Locked',
          'Stored Products Count',
          'Total On-Hand'
        ];
        rows = report.items.map((l: any) => [
          l.warehouseName,
          l.zone,
          l.barcode,
          l.aisle,
          l.rack,
          l.shelf,
          l.bin,
          l.status,
          l.isLocked ? 'YES' : 'NO',
          l.storedProductCount,
          l.totalQuantityOnHand
        ]);
        break;

      case 'receiving':
        headers = [
          'Receipt Number',
          'PO Number',
          'Supplier',
          'Warehouse',
          'Carrier',
          'Tracking Number',
          'Received At',
          'Received By',
          'Items Count',
          'Qty Received',
          'Qty Accepted',
          'Qty Rejected'
        ];
        rows = report.items.map((r: any) => [
          r.receiptNumber,
          r.poNumber,
          r.supplierName,
          r.warehouseName,
          r.carrierName,
          r.trackingNumber,
          new Date(r.receivedAt).toISOString(),
          r.receivedBy,
          r.itemsCount,
          r.totalReceived,
          r.totalAccepted,
          r.totalRejected
        ]);
        break;

      case 'orders':
        headers = [
          'Order Number',
          'Customer Name',
          'Customer Code',
          'Warehouse',
          'Order Date',
          'Status',
          'Total Lines',
          'Units Ordered',
          'Units Dispatched',
          'Total Amount ($)'
        ];
        rows = report.items.map((o: any) => [
          o.orderNumber,
          o.customerName,
          o.customerCode,
          o.warehouseName,
          new Date(o.orderDate).toISOString(),
          o.status,
          o.totalLines,
          o.totalUnitsOrdered,
          o.totalUnitsDispatched,
          o.totalAmount.toFixed(2)
        ]);
        break;

      case 'dispatch':
        headers = [
          'Dispatch Number',
          'Order Number',
          'Customer',
          'Carrier',
          'Tracking Number',
          'Shipping Method',
          'Warehouse',
          'Dispatched At',
          'Dispatched By'
        ];
        rows = report.items.map((d: any) => [
          d.dispatchNumber,
          d.orderNumber,
          d.customerName,
          d.carrierName,
          d.trackingNumber,
          d.shippingMethod,
          d.warehouseName,
          new Date(d.dispatchedAt).toISOString(),
          d.dispatchedBy
        ]);
        break;

      case 'low-stock':
        headers = [
          'SKU',
          'Product Name',
          'Category',
          'On-Hand Qty',
          'Reserved Qty',
          'Available ATP',
          'Reorder Threshold',
          'Shortfall Units',
          'Unit Cost ($)',
          'Est Replenish Cost ($)',
          'Urgency Status',
          'Suggested Supplier'
        ];
        rows = report.items.map((l: any) => [
          l.sku,
          l.productName,
          l.categoryName,
          l.quantityOnHand,
          l.quantityReserved,
          l.quantityAvailable,
          l.reorderPoint,
          l.shortfallQuantity,
          l.unitCost.toFixed(2),
          l.estimatedReplenishCost.toFixed(2),
          l.urgency,
          l.suggestedSupplier
        ]);
        break;

      case 'valuation':
        headers = [
          'SKU',
          'Product Name',
          'Category',
          'On-Hand Qty',
          'Unit Cost ($)',
          'Valuation ($)',
          'Asset Share (%)',
          'Costing Method'
        ];
        rows = report.items.map((v: any) => [
          v.sku,
          v.productName,
          v.categoryName,
          v.quantityOnHand,
          v.unitCost.toFixed(2),
          v.totalValuation.toFixed(2),
          `${v.assetSharePercent}%`,
          v.costingMethod
        ]);
        break;
    }

    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(','))
    ];

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `wms-${reportType}-report-${timestamp}.csv`;

    return {
      filename,
      csv: csvLines.join('\r\n')
    };
  }

  // ---------------------------------------------------------------------------
  // 5. RECONCILIATION AUDIT
  // ---------------------------------------------------------------------------
  async reconcileReportTotals(warehouseId?: string, productId?: string) {
    const whId = warehouseId || 'wh-01';
    const prodId = productId || 'prod-01';
    const res = await inventoryRepository.reconcileBalances(prodId, whId);
    return {
      warehouseId: whId,
      productId: prodId,
      totalPhysicalOnHand: res.physicalOnHand,
      totalLedgerSum: res.ledgerSum,
      isReconciled: res.reconciled,
      discrepancy: res.difference
    };
  }
}

export const analyticsRepository = new AnalyticsRepository();
