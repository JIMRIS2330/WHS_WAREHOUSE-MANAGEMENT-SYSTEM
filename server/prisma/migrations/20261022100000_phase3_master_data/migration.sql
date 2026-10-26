-- CreateEnum
CREATE TYPE "StorageClass" AS ENUM ('AMBIENT', 'COLD_STORAGE', 'FROZEN', 'HAZARDOUS', 'HIGH_VALUE', 'FRAGILE');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('EACH', 'PIECE', 'BOX', 'CARTON', 'PALLET', 'KILOGRAM', 'METER', 'LITER');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('RECEIVING_DOCK', 'STAGING', 'BULK_STORAGE', 'PICK_FACE', 'PACKING_STATION', 'SHIPPING_DOCK', 'QUALITY_CONTROL', 'QUARANTINE', 'RETURNS');

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '100 Industrial Parkway';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "postalCode" TEXT NOT NULL DEFAULT '60601';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "totalAreaM2" DOUBLE PRECISION NOT NULL DEFAULT 10000.0;

-- CreateTable Category
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable Product
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "uom" "UnitOfMeasure" NOT NULL DEFAULT 'EACH',
    "storageClass" "StorageClass" NOT NULL DEFAULT 'AMBIENT',
    "weightKg" DOUBLE PRECISION,
    "lengthCm" DOUBLE PRECISION,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 10,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
    "minStockLevel" INTEGER NOT NULL DEFAULT 5,
    "maxStockLevel" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable Supplier
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "paymentTerms" TEXT DEFAULT 'Net 30',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable Zone
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ZoneType" NOT NULL DEFAULT 'BULK_STORAGE',
    "isTemperatureControlled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable Location
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "aisle" TEXT NOT NULL,
    "rack" TEXT NOT NULL,
    "shelf" TEXT NOT NULL,
    "bin" TEXT NOT NULL,
    "pickSequence" INTEGER NOT NULL DEFAULT 100,
    "maxWeightKg" DOUBLE PRECISION DEFAULT 500.0,
    "maxVolumeM3" DOUBLE PRECISION DEFAULT 2.5,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- Indexes & Constraints
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "Category_code_idx" ON "Category"("code");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
CREATE INDEX "Supplier_code_idx" ON "Supplier"("code");
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

CREATE UNIQUE INDEX "Zone_warehouseId_code_key" ON "Zone"("warehouseId", "code");
CREATE INDEX "Zone_warehouseId_idx" ON "Zone"("warehouseId");

CREATE UNIQUE INDEX "Location_barcode_key" ON "Location"("barcode");
CREATE UNIQUE INDEX "Location_warehouseId_aisle_rack_shelf_bin_key" ON "Location"("warehouseId", "aisle", "rack", "shelf", "bin");
CREATE INDEX "Location_barcode_idx" ON "Location"("barcode");
CREATE INDEX "Location_zoneId_idx" ON "Location"("zoneId");
CREATE INDEX "Location_warehouseId_idx" ON "Location"("warehouseId");

-- Foreign Keys
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
