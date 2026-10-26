import { prisma } from '../../config/prisma.js';

export interface CategoryData {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductData {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId: string;
  category?: CategoryData | null;
  uom: string;
  storageClass: string;
  weightKg?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  reorderQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierData {
  id: string;
  code: string;
  name: string;
  contactName?: string | null;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  leadTimeDays: number;
  paymentTerms?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseData {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  totalAreaM2: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  zonesCount?: number;
  locationsCount?: number;
}

export interface ZoneData {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: string;
  isTemperatureControlled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationData {
  id: string;
  warehouseId: string;
  zoneId: string;
  zone?: ZoneData | null;
  barcode: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  pickSequence: number;
  maxWeightKg?: number | null;
  maxVolumeM3?: number | null;
  isOccupied: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// IN-MEMORY SYNCHRONIZED STORE (Used whenever PostgreSQL is offline)
// -----------------------------------------------------------------------------
const MEM_CATEGORIES: CategoryData[] = [
  {
    id: 'cat-01',
    code: 'ELEC',
    name: 'Electronics & Motors',
    description: 'Electric motors, drives, controllers, and wiring',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-02',
    code: 'PACK',
    name: 'Packaging & Cartons',
    description: 'Shipping boxes, tape, pallets, and wrap',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-03',
    code: 'HYDR',
    name: 'Hydraulics & Seals',
    description: 'Pumps, cylinders, O-rings, and hydraulic fluids',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-04',
    code: 'CHEM',
    name: 'Chemicals & Solvents',
    description: 'Degreasers, lubricants, and hazardous cleaning agents',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_PRODUCTS: ProductData[] = [
  {
    id: 'prod-01',
    sku: 'ELEC-0092',
    barcode: '883921004121',
    name: 'Brushless DC Motor 24V 350W',
    description: 'High efficiency BLDC motor with integrated hall sensors',
    categoryId: 'cat-01',
    uom: 'EACH',
    storageClass: 'AMBIENT',
    weightKg: 2.4,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 12,
    costPrice: 45.0,
    sellingPrice: 89.0,
    reorderPoint: 50,
    reorderQuantity: 100,
    minStockLevel: 10,
    maxStockLevel: 500,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-02',
    sku: 'PAL-0092',
    barcode: '883921004992',
    name: 'Euro Standard Wood Pallet (Treated)',
    description: 'Heat treated 1200x800mm EUR-1 wooden pallet',
    categoryId: 'cat-02',
    uom: 'PIECE',
    storageClass: 'AMBIENT',
    weightKg: 22.0,
    lengthCm: 120,
    widthCm: 80,
    heightCm: 14,
    costPrice: 12.5,
    sellingPrice: 24.0,
    reorderPoint: 20,
    reorderQuantity: 60,
    minStockLevel: 5,
    maxStockLevel: 200,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-03',
    sku: 'HYDR-4401',
    barcode: '883921003310',
    name: 'Hydraulic Seal Kit G-4 Industrial',
    description: 'NBR 90 high pressure seal kit for hydraulic rams',
    categoryId: 'cat-03',
    uom: 'BOX',
    storageClass: 'AMBIENT',
    weightKg: 0.8,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 5,
    costPrice: 28.0,
    sellingPrice: 65.0,
    reorderPoint: 25,
    reorderQuantity: 50,
    minStockLevel: 5,
    maxStockLevel: 150,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-04',
    sku: 'CHEM-3301',
    barcode: '883921001189',
    name: 'Industrial Solvent Degreaser 5L',
    description: 'Heavy duty workshop solvent degreaser jug',
    categoryId: 'cat-04',
    uom: 'LITER',
    storageClass: 'HAZARDOUS',
    weightKg: 5.2,
    lengthCm: 30,
    widthCm: 18,
    heightCm: 18,
    costPrice: 18.0,
    sellingPrice: 42.0,
    reorderPoint: 15,
    reorderQuantity: 30,
    minStockLevel: 5,
    maxStockLevel: 80,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_SUPPLIERS: SupplierData[] = [
  {
    id: 'sup-01',
    code: 'SUP-001',
    name: 'Apex Industrial Components',
    contactName: 'David Miller',
    email: 'dmiller@apexcomponents.com',
    phone: '+1 (312) 555-0192',
    address: '450 Precision Parkway',
    city: 'Chicago',
    country: 'USA',
    leadTimeDays: 5,
    paymentTerms: 'Net 30',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sup-02',
    code: 'SUP-002',
    name: 'Global Packaging Solutions LLC',
    contactName: 'Brenda Chen',
    email: 'orders@globalpackaging.com',
    phone: '+1 (201) 555-8832',
    address: '120 Logistics Blvd',
    city: 'Newark',
    country: 'USA',
    leadTimeDays: 3,
    paymentTerms: 'Net 15',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sup-03',
    code: 'SUP-003',
    name: 'Nordic Fluid Technologies',
    contactName: 'Soren Lindqvist',
    email: 'sales@nordicfluids.se',
    phone: '+46 8 555 4910',
    address: 'Vintergatan 14',
    city: 'Stockholm',
    country: 'Sweden',
    leadTimeDays: 12,
    paymentTerms: 'Net 60',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_WAREHOUSES: WarehouseData[] = [
  {
    id: 'wh-01',
    code: 'WH-01',
    name: 'Central Distribution Center',
    address: '500 Logistics Way',
    city: 'Chicago, IL',
    country: 'USA',
    postalCode: '60601',
    totalAreaM2: 24500.0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wh-02',
    code: 'WH-02',
    name: 'East Coast Fulfillment Hub',
    address: '220 Seaport Blvd',
    city: 'Newark, NJ',
    country: 'USA',
    postalCode: '07101',
    totalAreaM2: 18200.0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_ZONES: ZoneData[] = [
  {
    id: 'zone-01',
    warehouseId: 'wh-01',
    code: 'Z-PICK',
    name: 'High-Velocity Pick Face',
    type: 'PICK_FACE',
    isTemperatureControlled: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'zone-02',
    warehouseId: 'wh-01',
    code: 'Z-BULK',
    name: 'Bulk Pallet Racks',
    type: 'BULK_STORAGE',
    isTemperatureControlled: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'zone-03',
    warehouseId: 'wh-01',
    code: 'Z-COLD',
    name: 'Cold Storage Room',
    type: 'QUALITY_CONTROL',
    isTemperatureControlled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_LOCATIONS: LocationData[] = [
  {
    id: 'loc-01',
    warehouseId: 'wh-01',
    zoneId: 'zone-01',
    barcode: 'WH1-Z01-A01-R01-S01-B01',
    aisle: 'A01',
    rack: 'R01',
    shelf: 'S01',
    bin: 'B01',
    pickSequence: 10,
    maxWeightKg: 500.0,
    maxVolumeM3: 2.0,
    isOccupied: true,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'loc-02',
    warehouseId: 'wh-01',
    zoneId: 'zone-01',
    barcode: 'WH1-Z01-A01-R01-S01-B02',
    aisle: 'A01',
    rack: 'R01',
    shelf: 'S01',
    bin: 'B02',
    pickSequence: 12,
    maxWeightKg: 500.0,
    maxVolumeM3: 2.0,
    isOccupied: false,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'loc-03',
    warehouseId: 'wh-01',
    zoneId: 'zone-02',
    barcode: 'WH1-Z02-A05-R03-S02-B01',
    aisle: 'A05',
    rack: 'R03',
    shelf: 'S02',
    bin: 'B01',
    pickSequence: 45,
    maxWeightKg: 1200.0,
    maxVolumeM3: 4.5,
    isOccupied: true,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

class MasterDataRepository {
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

  // ===========================================================================
  // CATEGORIES
  // ===========================================================================
  async listCategories(): Promise<CategoryData[]> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.category.findMany({
          orderBy: { name: 'asc' }
        })) as CategoryData[];
      } catch {}
    }
    return [...MEM_CATEGORIES].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findCategoryById(id: string): Promise<CategoryData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.category.findUnique({ where: { id } })) as CategoryData | null;
      } catch {}
    }
    return MEM_CATEGORIES.find(c => c.id === id) || null;
  }

  async findCategoryByCode(code: string): Promise<CategoryData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.category.findUnique({
          where: { code: code.toUpperCase() }
        })) as CategoryData | null;
      } catch {}
    }
    return MEM_CATEGORIES.find(c => c.code === code.toUpperCase()) || null;
  }

  async findCategoryByName(name: string): Promise<CategoryData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.category.findUnique({ where: { name } })) as CategoryData | null;
      } catch {}
    }
    return MEM_CATEGORIES.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async createCategory(data: {
    code: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
  }): Promise<CategoryData> {
    // Uniqueness checks
    const existingCode = await this.findCategoryByCode(data.code);
    if (existingCode) throw new Error(`Category code '${data.code}' already exists`);
    const existingName = await this.findCategoryByName(data.name);
    if (existingName) throw new Error(`Category name '${data.name}' already exists`);

    // Parent check if provided
    if (data.parentId) {
      const parent = await this.findCategoryById(data.parentId);
      if (!parent) throw new Error(`Parent category '${data.parentId}' does not exist`);
    }

    const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const newCat: CategoryData = {
      id,
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description || null,
      parentId: data.parentId || null,
      createdAt: now,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const created = await prisma.category.create({ data: newCat });
        return created as CategoryData;
      } catch {}
    }

    MEM_CATEGORIES.push(newCat);
    return newCat;
  }

  async updateCategory(id: string, data: Partial<CategoryData>): Promise<CategoryData> {
    const cat = await this.findCategoryById(id);
    if (!cat) throw new Error(`Category '${id}' not found`);

    if (data.code && data.code.toUpperCase() !== cat.code) {
      const existing = await this.findCategoryByCode(data.code);
      if (existing) throw new Error(`Category code '${data.code}' already in use`);
    }

    const now = new Date();
    const updated: CategoryData = {
      ...cat,
      ...data,
      code: data.code ? data.code.toUpperCase() : cat.code,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const res = await prisma.category.update({ where: { id }, data: updated });
        return res as CategoryData;
      } catch {}
    }

    const idx = MEM_CATEGORIES.findIndex(c => c.id === id);
    MEM_CATEGORIES[idx] = updated;
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const cat = await this.findCategoryById(id);
    if (!cat) throw new Error(`Category '${id}' not found`);

    // Foreign Key Protection: Check products
    const attachedProducts = (await this.listProducts({})).items.filter(p => p.categoryId === id);
    if (attachedProducts.length > 0) {
      throw new Error(
        `Cannot delete category '${cat.name}': it is referenced by ${attachedProducts.length} active product(s)`
      );
    }

    // Check child categories
    const childCategories = MEM_CATEGORIES.filter(c => c.parentId === id);
    if (childCategories.length > 0) {
      throw new Error(
        `Cannot delete category '${cat.name}': it has ${childCategories.length} child sub-categories attached`
      );
    }

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        await prisma.category.delete({ where: { id } });
        return;
      } catch {}
    }

    const idx = MEM_CATEGORIES.findIndex(c => c.id === id);
    if (idx !== -1) MEM_CATEGORIES.splice(idx, 1);
  }

  // ===========================================================================
  // PRODUCTS
  // ===========================================================================
  async listProducts(params: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: ProductData[]; total: number; page: number; totalPages: number }> {
    const isPg = await this.checkPostgres();
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));

    if (isPg) {
      try {
        const where: any = {};
        if (params.search) {
          where.OR = [
            { sku: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { barcode: { contains: params.search, mode: 'insensitive' } }
          ];
        }
        if (params.categoryId) where.categoryId = params.categoryId;
        if (params.isActive !== undefined) where.isActive = params.isActive;

        const [total, rawItems] = await Promise.all([
          prisma.product.count({ where }),
          prisma.product.findMany({
            where,
            include: { category: true },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' }
          })
        ]);

        return {
          items: rawItems as ProductData[],
          total,
          page,
          totalPages: Math.ceil(total / limit)
        };
      } catch {}
    }

    let items = [...MEM_PRODUCTS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        p =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    if (params.categoryId) {
      items = items.filter(p => p.categoryId === params.categoryId);
    }
    if (params.isActive !== undefined) {
      items = items.filter(p => p.isActive === params.isActive);
    }

    const total = items.length;
    // Enrich with category object
    items = items.map(p => ({
      ...p,
      category: MEM_CATEGORIES.find(c => c.id === p.categoryId) || null
    }));

    // Sort
    const sortBy = (params.sortBy as keyof ProductData) || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    items.sort((a, b) => {
      const valA = (a[sortBy] as any) || '';
      const valB = (b[sortBy] as any) || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);

    return {
      items: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findProductById(id: string): Promise<ProductData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.product.findUnique({
          where: { id },
          include: { category: true }
        })) as ProductData | null;
      } catch {}
    }
    const prod = MEM_PRODUCTS.find(p => p.id === id);
    if (!prod) return null;
    return {
      ...prod,
      category: MEM_CATEGORIES.find(c => c.id === prod.categoryId) || null
    };
  }

  async findProductBySku(sku: string): Promise<ProductData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.product.findUnique({
          where: { sku: sku.toUpperCase() },
          include: { category: true }
        })) as ProductData | null;
      } catch {}
    }
    const prod = MEM_PRODUCTS.find(p => p.sku === sku.toUpperCase());
    if (!prod) return null;
    return {
      ...prod,
      category: MEM_CATEGORIES.find(c => c.id === prod.categoryId) || null
    };
  }

  async findProductByBarcode(barcode: string): Promise<ProductData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.product.findUnique({
          where: { barcode },
          include: { category: true }
        })) as ProductData | null;
      } catch {}
    }
    const prod = MEM_PRODUCTS.find(p => p.barcode === barcode);
    if (!prod) return null;
    return {
      ...prod,
      category: MEM_CATEGORIES.find(c => c.id === prod.categoryId) || null
    };
  }

  async createProduct(data: Omit<ProductData, 'id' | 'createdAt' | 'updatedAt' | 'category'>): Promise<ProductData> {
    // 1. SKU uniqueness
    const existingSku = await this.findProductBySku(data.sku);
    if (existingSku) throw new Error(`Product with SKU '${data.sku}' already exists`);

    // 2. Barcode uniqueness if provided
    if (data.barcode) {
      const existingBarcode = await this.findProductByBarcode(data.barcode);
      if (existingBarcode) throw new Error(`Product with Barcode '${data.barcode}' already exists`);
    }

    // 3. Category existence check
    const category = await this.findCategoryById(data.categoryId);
    if (!category) throw new Error(`Referenced Category '${data.categoryId}' does not exist`);

    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const newProd: ProductData = {
      ...data,
      id,
      sku: data.sku.toUpperCase(),
      createdAt: now,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const created = await prisma.product.create({
          data: newProd as any,
          include: { category: true }
        });
        return created as ProductData;
      } catch {}
    }

    MEM_PRODUCTS.push(newProd);
    return { ...newProd, category };
  }

  async updateProduct(id: string, data: Partial<ProductData>): Promise<ProductData> {
    const prod = await this.findProductById(id);
    if (!prod) throw new Error(`Product '${id}' not found`);

    if (data.sku && data.sku.toUpperCase() !== prod.sku) {
      const existing = await this.findProductBySku(data.sku);
      if (existing) throw new Error(`SKU '${data.sku}' is already assigned to another product`);
    }

    if (data.barcode && data.barcode !== prod.barcode) {
      const existing = await this.findProductByBarcode(data.barcode);
      if (existing) throw new Error(`Barcode '${data.barcode}' is already assigned to another product`);
    }

    if (data.categoryId && data.categoryId !== prod.categoryId) {
      const cat = await this.findCategoryById(data.categoryId);
      if (!cat) throw new Error(`Category '${data.categoryId}' does not exist`);
    }

    const now = new Date();
    const updated: ProductData = {
      ...prod,
      ...data,
      sku: data.sku ? data.sku.toUpperCase() : prod.sku,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const res = await prisma.product.update({
          where: { id },
          data: {
            ...data,
            sku: data.sku ? data.sku.toUpperCase() : undefined,
            updatedAt: now
          } as any,
          include: { category: true }
        });
        return res as ProductData;
      } catch {}
    }

    const idx = MEM_PRODUCTS.findIndex(p => p.id === id);
    MEM_PRODUCTS[idx] = updated;
    const cat = await this.findCategoryById(updated.categoryId);
    return { ...updated, category: cat };
  }

  async deleteProduct(id: string): Promise<{ deleted: boolean; deactivated?: boolean }> {
    const prod = await this.findProductById(id);
    if (!prod) throw new Error(`Product '${id}' not found`);

    // In WMS, products with historical movements or transactions are safely deactivated
    // rather than abruptly deleted to maintain ledger integrity
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        await prisma.product.update({
          where: { id },
          data: { isActive: false }
        });
        return { deleted: true, deactivated: true };
      } catch {}
    }

    prod.isActive = false;
    prod.updatedAt = new Date();
    return { deleted: true, deactivated: true };
  }

  // ===========================================================================
  // SUPPLIERS
  // ===========================================================================
  async listSuppliers(params: { search?: string; isActive?: boolean } = {}): Promise<SupplierData[]> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const where: any = {};
        if (params.search) {
          where.OR = [
            { code: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } }
          ];
        }
        if (params.isActive !== undefined) where.isActive = params.isActive;
        return (await prisma.supplier.findMany({
          where,
          orderBy: { name: 'asc' }
        })) as SupplierData[];
      } catch {}
    }

    let items = [...MEM_SUPPLIERS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        s =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (params.isActive !== undefined) {
      items = items.filter(s => s.isActive === params.isActive);
    }
    return items;
  }

  async findSupplierById(id: string): Promise<SupplierData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.supplier.findUnique({ where: { id } })) as SupplierData | null;
      } catch {}
    }
    return MEM_SUPPLIERS.find(s => s.id === id) || null;
  }

  async findSupplierByCode(code: string): Promise<SupplierData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.supplier.findUnique({
          where: { code: code.toUpperCase() }
        })) as SupplierData | null;
      } catch {}
    }
    return MEM_SUPPLIERS.find(s => s.code === code.toUpperCase()) || null;
  }

  async createSupplier(data: Omit<SupplierData, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupplierData> {
    const existing = await this.findSupplierByCode(data.code);
    if (existing) throw new Error(`Supplier code '${data.code}' already exists`);

    const id = `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const newSup: SupplierData = {
      ...data,
      id,
      code: data.code.toUpperCase(),
      createdAt: now,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const created = await prisma.supplier.create({ data: newSup });
        return created as SupplierData;
      } catch {}
    }

    MEM_SUPPLIERS.push(newSup);
    return newSup;
  }

  async updateSupplier(id: string, data: Partial<SupplierData>): Promise<SupplierData> {
    const sup = await this.findSupplierById(id);
    if (!sup) throw new Error(`Supplier '${id}' not found`);

    if (data.code && data.code.toUpperCase() !== sup.code) {
      const existing = await this.findSupplierByCode(data.code);
      if (existing) throw new Error(`Supplier code '${data.code}' already in use`);
    }

    const now = new Date();
    const updated: SupplierData = {
      ...sup,
      ...data,
      code: data.code ? data.code.toUpperCase() : sup.code,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const res = await prisma.supplier.update({ where: { id }, data: updated });
        return res as SupplierData;
      } catch {}
    }

    const idx = MEM_SUPPLIERS.findIndex(s => s.id === id);
    MEM_SUPPLIERS[idx] = updated;
    return updated;
  }

  async deleteSupplier(id: string): Promise<void> {
    const sup = await this.findSupplierById(id);
    if (!sup) throw new Error(`Supplier '${id}' not found`);

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        await prisma.supplier.delete({ where: { id } });
        return;
      } catch {}
    }

    const idx = MEM_SUPPLIERS.findIndex(s => s.id === id);
    if (idx !== -1) MEM_SUPPLIERS.splice(idx, 1);
  }

  // ===========================================================================
  // WAREHOUSES
  // ===========================================================================
  async listWarehouses(): Promise<WarehouseData[]> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const raw = await prisma.warehouse.findMany({
          include: {
            _count: {
              select: { zones: true, locations: true }
            }
          },
          orderBy: { code: 'asc' }
        });
        return raw.map(w => ({
          id: w.id,
          code: w.code,
          name: w.name,
          address: w.address,
          city: w.city,
          country: w.country,
          postalCode: w.postalCode,
          totalAreaM2: w.totalAreaM2,
          isActive: w.isActive,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          zonesCount: w._count?.zones || 0,
          locationsCount: w._count?.locations || 0
        }));
      } catch {}
    }

    return MEM_WAREHOUSES.map(w => ({
      ...w,
      zonesCount: MEM_ZONES.filter(z => z.warehouseId === w.id).length,
      locationsCount: MEM_LOCATIONS.filter(l => l.warehouseId === w.id).length
    }));
  }

  async findWarehouseById(id: string): Promise<WarehouseData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.warehouse.findUnique({ where: { id } })) as WarehouseData | null;
      } catch {}
    }
    return MEM_WAREHOUSES.find(w => w.id === id) || null;
  }

  async findWarehouseByCode(code: string): Promise<WarehouseData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.warehouse.findUnique({
          where: { code: code.toUpperCase() }
        })) as WarehouseData | null;
      } catch {}
    }
    return MEM_WAREHOUSES.find(w => w.code === code.toUpperCase()) || null;
  }

  async createWarehouse(data: Omit<WarehouseData, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarehouseData> {
    const existing = await this.findWarehouseByCode(data.code);
    if (existing) throw new Error(`Warehouse with code '${data.code}' already exists`);

    const id = `wh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const newWh: WarehouseData = {
      ...data,
      id,
      code: data.code.toUpperCase(),
      createdAt: now,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const created = await prisma.warehouse.create({ data: newWh });
        return created as WarehouseData;
      } catch {}
    }

    MEM_WAREHOUSES.push(newWh);
    return newWh;
  }

  async updateWarehouse(id: string, data: Partial<WarehouseData>): Promise<WarehouseData> {
    const wh = await this.findWarehouseById(id);
    if (!wh) throw new Error(`Warehouse '${id}' not found`);

    if (data.code && data.code.toUpperCase() !== wh.code) {
      const existing = await this.findWarehouseByCode(data.code);
      if (existing) throw new Error(`Warehouse code '${data.code}' already in use`);
    }

    const now = new Date();
    const updated: WarehouseData = {
      ...wh,
      ...data,
      code: data.code ? data.code.toUpperCase() : wh.code,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const res = await prisma.warehouse.update({ where: { id }, data: updated });
        return res as WarehouseData;
      } catch {}
    }

    const idx = MEM_WAREHOUSES.findIndex(w => w.id === id);
    MEM_WAREHOUSES[idx] = updated;
    return updated;
  }

  async deleteWarehouse(id: string): Promise<void> {
    const wh = await this.findWarehouseById(id);
    if (!wh) throw new Error(`Warehouse '${id}' not found`);

    // Foreign Key Protection: Check zones
    const zones = MEM_ZONES.filter(z => z.warehouseId === id);
    if (zones.length > 0) {
      throw new Error(`Cannot delete warehouse '${wh.name}': it contains ${zones.length} active zone(s)`);
    }

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        await prisma.warehouse.delete({ where: { id } });
        return;
      } catch {}
    }

    const idx = MEM_WAREHOUSES.findIndex(w => w.id === id);
    if (idx !== -1) MEM_WAREHOUSES.splice(idx, 1);
  }

  // ===========================================================================
  // ZONES
  // ===========================================================================
  async listZones(warehouseId: string): Promise<ZoneData[]> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.zone.findMany({
          where: { warehouseId },
          orderBy: { code: 'asc' }
        })) as ZoneData[];
      } catch {}
    }
    return MEM_ZONES.filter(z => z.warehouseId === warehouseId);
  }

  async findZoneById(id: string): Promise<ZoneData | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.zone.findUnique({ where: { id } })) as ZoneData | null;
      } catch {}
    }
    return MEM_ZONES.find(z => z.id === id) || null;
  }

  async createZone(data: Omit<ZoneData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ZoneData> {
    const wh = await this.findWarehouseById(data.warehouseId);
    if (!wh) throw new Error(`Warehouse '${data.warehouseId}' does not exist`);

    const existingInWh = MEM_ZONES.find(
      z => z.warehouseId === data.warehouseId && z.code === data.code.toUpperCase()
    );
    if (existingInWh) {
      throw new Error(`Zone with code '${data.code}' already exists in warehouse '${wh.name}'`);
    }

    const id = `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const newZone: ZoneData = {
      ...data,
      id,
      code: data.code.toUpperCase(),
      createdAt: now,
      updatedAt: now
    };

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const created = await prisma.zone.create({ data: newZone as any });
        return created as ZoneData;
      } catch {}
    }

    MEM_ZONES.push(newZone);
    return newZone;
  }

  async deleteZone(id: string): Promise<void> {
    const zone = await this.findZoneById(id);
    if (!zone) throw new Error(`Zone '${id}' not found`);

    // Foreign Key Protection: Check bins
    const bins = MEM_LOCATIONS.filter(l => l.zoneId === id);
    if (bins.length > 0) {
      throw new Error(`Cannot delete zone '${zone.name}': it contains ${bins.length} bin location(s)`);
    }

    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        await prisma.zone.delete({ where: { id } });
        return;
      } catch {}
    }

    const idx = MEM_ZONES.findIndex(z => z.id === id);
    if (idx !== -1) MEM_ZONES.splice(idx, 1);
  }

  // ===========================================================================
  // LOCATIONS (STORAGE BINS)
  // ===========================================================================
  async listLocations(params: {
    warehouseId: string;
    zoneId?: string;
    search?: string;
    isLocked?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: LocationData[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 25));

    let items = MEM_LOCATIONS.filter(l => l.warehouseId === params.warehouseId);
    if (params.zoneId) items = items.filter(l => l.zoneId === params.zoneId);
    if (params.isLocked !== undefined) items = items.filter(l => l.isLocked === params.isLocked);
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        l =>
          l.barcode.toLowerCase().includes(q) ||
          l.aisle.toLowerCase().includes(q) ||
          l.bin.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    // Enrich with zone
    items = items.map(l => ({
      ...l,
      zone: MEM_ZONES.find(z => z.id === l.zoneId) || null
    }));

    // Sort by pickSequence
    items.sort((a, b) => a.pickSequence - b.pickSequence);

    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);

    return {
      items: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findLocationById(id: string): Promise<LocationData | null> {
    const loc = MEM_LOCATIONS.find(l => l.id === id);
    if (!loc) return null;
    return {
      ...loc,
      zone: MEM_ZONES.find(z => z.id === loc.zoneId) || null
    };
  }

  async findLocationByBarcode(barcode: string): Promise<LocationData | null> {
    const loc = MEM_LOCATIONS.find(l => l.barcode.toUpperCase() === barcode.toUpperCase());
    if (!loc) return null;
    return {
      ...loc,
      zone: MEM_ZONES.find(z => z.id === loc.zoneId) || null
    };
  }

  async createLocation(data: {
    warehouseId: string;
    zoneId: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin: string;
    barcode?: string;
    pickSequence?: number;
    maxWeightKg?: number;
    maxVolumeM3?: number;
  }): Promise<LocationData> {
    const wh = await this.findWarehouseById(data.warehouseId);
    if (!wh) throw new Error(`Warehouse '${data.warehouseId}' does not exist`);

    const zone = await this.findZoneById(data.zoneId);
    if (!zone) throw new Error(`Zone '${data.zoneId}' does not exist`);

    // Check duplicate coordinate in warehouse
    const duplicate = MEM_LOCATIONS.find(
      l =>
        l.warehouseId === data.warehouseId &&
        l.aisle === data.aisle.toUpperCase() &&
        l.rack === data.rack.toUpperCase() &&
        l.shelf === data.shelf.toUpperCase() &&
        l.bin === data.bin.toUpperCase()
    );
    if (duplicate) {
      throw new Error(
        `Location bin ${data.aisle}-${data.rack}-${data.shelf}-${data.bin} already exists in ${wh.name}`
      );
    }

    // Auto-generate canonical barcode if not specified
    const barcode =
      data.barcode?.toUpperCase() ||
      `${wh.code}-${zone.code}-${data.aisle.toUpperCase()}-${data.rack.toUpperCase()}-${data.shelf.toUpperCase()}-${data.bin.toUpperCase()}`;

    const existingBarcode = await this.findLocationByBarcode(barcode);
    if (existingBarcode) throw new Error(`Location barcode '${barcode}' already exists`);

    const id = `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const newLoc: LocationData = {
      id,
      warehouseId: data.warehouseId,
      zoneId: data.zoneId,
      barcode,
      aisle: data.aisle.toUpperCase(),
      rack: data.rack.toUpperCase(),
      shelf: data.shelf.toUpperCase(),
      bin: data.bin.toUpperCase(),
      pickSequence: data.pickSequence || 100,
      maxWeightKg: data.maxWeightKg || 500,
      maxVolumeM3: data.maxVolumeM3 || 2.5,
      isOccupied: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now
    };

    MEM_LOCATIONS.push(newLoc);
    return { ...newLoc, zone };
  }

  async updateLocation(id: string, data: Partial<LocationData>): Promise<LocationData> {
    const loc = await this.findLocationById(id);
    if (!loc) throw new Error(`Location '${id}' not found`);

    const now = new Date();
    const updated: LocationData = {
      ...loc,
      ...data,
      updatedAt: now
    };

    const idx = MEM_LOCATIONS.findIndex(l => l.id === id);
    MEM_LOCATIONS[idx] = updated;
    return updated;
  }

  async deleteLocation(id: string): Promise<void> {
    const loc = await this.findLocationById(id);
    if (!loc) throw new Error(`Location '${id}' not found`);

    // Foreign Key / Transaction Protection: Cannot delete if occupied
    if (loc.isOccupied) {
      throw new Error(`Cannot delete bin '${loc.barcode}': it is currently occupied with active inventory`);
    }

    const idx = MEM_LOCATIONS.findIndex(l => l.id === id);
    if (idx !== -1) MEM_LOCATIONS.splice(idx, 1);
  }
}

export const masterDataRepository = new MasterDataRepository();
