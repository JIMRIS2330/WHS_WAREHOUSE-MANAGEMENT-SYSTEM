-- =============================================================================
-- Migration: Phase 6 - Customer Orders & Outbound Fulfillment
-- =============================================================================

-- CreateEnum OrderStatus
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKED', 'DISPATCHED', 'CANCELLED');

-- CreateEnum PickTaskStatus
CREATE TYPE "PickTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PICKED', 'SHORT_PICKED');

-- CreateTable Customer
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomerOrder
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredDate" TIMESTAMP(3),
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingCountry" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrderLineItem
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" DOUBLE PRECISION NOT NULL,
    "quantityReserved" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quantityPicked" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quantityPacked" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quantityDispatched" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable PickTask
CREATE TABLE "PickTask" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderLineItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityToPick" DOUBLE PRECISION NOT NULL,
    "quantityPicked" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "PickTaskStatus" NOT NULL DEFAULT 'PENDING',
    "pickSequence" INTEGER NOT NULL DEFAULT 100,
    "pickedByUserId" TEXT,
    "pickedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable Shipment
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "shippingMethod" TEXT,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_code_idx" ON "Customer"("code");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

CREATE UNIQUE INDEX "CustomerOrder_orderNumber_key" ON "CustomerOrder"("orderNumber");
CREATE INDEX "CustomerOrder_orderNumber_idx" ON "CustomerOrder"("orderNumber");
CREATE INDEX "CustomerOrder_customerId_idx" ON "CustomerOrder"("customerId");
CREATE INDEX "CustomerOrder_warehouseId_idx" ON "CustomerOrder"("warehouseId");
CREATE INDEX "CustomerOrder_status_idx" ON "CustomerOrder"("status");

CREATE UNIQUE INDEX "OrderLineItem_orderId_productId_key" ON "OrderLineItem"("orderId", "productId");
CREATE INDEX "OrderLineItem_orderId_idx" ON "OrderLineItem"("orderId");
CREATE INDEX "OrderLineItem_productId_idx" ON "OrderLineItem"("productId");

CREATE INDEX "PickTask_orderId_idx" ON "PickTask"("orderId");
CREATE INDEX "PickTask_orderLineItemId_idx" ON "PickTask"("orderLineItemId");
CREATE INDEX "PickTask_productId_idx" ON "PickTask"("productId");
CREATE INDEX "PickTask_locationId_idx" ON "PickTask"("locationId");
CREATE INDEX "PickTask_status_idx" ON "PickTask"("status");

CREATE UNIQUE INDEX "Shipment_dispatchNumber_key" ON "Shipment"("dispatchNumber");
CREATE INDEX "Shipment_dispatchNumber_idx" ON "Shipment"("dispatchNumber");
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");
CREATE INDEX "Shipment_warehouseId_idx" ON "Shipment"("warehouseId");
CREATE INDEX "Shipment_dispatchedAt_idx" ON "Shipment"("dispatchedAt");

-- Foreign Keys
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_orderLineItemId_fkey" FOREIGN KEY ("orderLineItemId") REFERENCES "OrderLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_pickedByUserId_fkey" FOREIGN KEY ("pickedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_dispatchedByUserId_fkey" FOREIGN KEY ("dispatchedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
