import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Barcode,
  ArrowUpDown,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} from '../api/masterData';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    uom: 'EACH',
    storageClass: 'AMBIENT',
    barcode: '',
    costPrice: 0,
    sellingPrice: 0,
    reorderPoint: 10,
    reorderQuantity: 50,
    weightKg: 0,
    isActive: true
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        getCategories(),
        getProducts({
          search: search || undefined,
          categoryId: selectedCategory || undefined,
          isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
          page,
          limit: 10
        })
      ]);
      setCategories(catsRes.data || []);
      setProducts(prodsRes.data || []);
      setTotalPages(prodsRes.meta?.totalPages || 1);
      setTotalProducts(prodsRes.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load master products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, statusFilter, page]);

  const handleOpenCreate = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      uom: 'EACH',
      storageClass: 'AMBIENT',
      barcode: '',
      costPrice: 0,
      sellingPrice: 0,
      reorderPoint: 10,
      reorderQuantity: 50,
      weightKg: 0,
      isActive: true
    });
    setError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setSelectedProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      categoryId: p.categoryId,
      uom: p.uom || 'EACH',
      storageClass: p.storageClass || 'AMBIENT',
      barcode: p.barcode || '',
      costPrice: p.costPrice || 0,
      sellingPrice: p.sellingPrice || 0,
      reorderPoint: p.reorderPoint || 10,
      reorderQuantity: p.reorderQuantity || 50,
      weightKg: p.weightKg || 0,
      isActive: p.isActive
    });
    setError(null);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (p: any) => {
    setSelectedProduct(p);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await createProduct({
        ...formData,
        sku: formData.sku.toUpperCase(),
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        reorderPoint: Number(formData.reorderPoint),
        reorderQuantity: Number(formData.reorderQuantity),
        weightKg: Number(formData.weightKg) || undefined,
        barcode: formData.barcode || undefined
      });
      setIsCreateOpen(false);
      setSuccessMsg(`Product SKU ${formData.sku} registered successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateProduct(selectedProduct.id, {
        ...formData,
        sku: formData.sku.toUpperCase(),
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        reorderPoint: Number(formData.reorderPoint),
        reorderQuantity: Number(formData.reorderQuantity),
        weightKg: Number(formData.weightKg) || undefined,
        barcode: formData.barcode || undefined
      });
      setIsEditOpen(false);
      setSuccessMsg(`Product ${formData.sku} updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    setActionLoading(true);
    try {
      await deleteProduct(selectedProduct.id);
      setIsDeleteOpen(false);
      setSuccessMsg(`Product ${selectedProduct.sku} safely deactivated.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate product');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-400" />
            Product Master Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global catalog with physical dimensions, barcodes, unit weights and storage classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadData}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            New Product
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && <Alert type="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />}
      {error && !isCreateOpen && !isEditOpen && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="w-full sm:w-64">
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search SKU, name, or barcode..."
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <Select
              className="w-48"
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              className="w-36"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </div>

          <div className="text-xs text-slate-400">
            Total: <span className="font-semibold text-white">{totalProducts}</span> products
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Fetching products from warehouse database..." />
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No products found matching criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU & Details</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Cost / Price</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-mono text-xs font-bold text-brand-400">{p.sku}</div>
                      <div className="text-xs font-semibold text-white">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-300">
                      {p.barcode ? (
                        <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {p.barcode}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {p.category?.name || 'Unassigned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-300">{p.uom}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="text-emerald-400 font-semibold">${p.sellingPrice?.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">Cost: ${p.costPrice?.toFixed(2)}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-amber-400 font-semibold">
                      {p.reorderPoint} units
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'success' : 'danger'} size="sm" dot>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(p)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs">
              <span className="text-slate-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE PRODUCT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Master Product"
        description="Add a new item to the warehouse master catalog."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateSubmit} isLoading={actionLoading}>
              Save Product
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          {error && <Alert type="error" message={error} className="mb-2" />}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="SKU (Stock Keeping Unit)" required helperText="Unique identifier (e.g. ELEC-0092)">
              <Input
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="ELEC-0092"
                required
              />
            </FormField>

            <FormField label="Optional Barcode / UPC">
              <Input
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="883921004121"
              />
            </FormField>
          </div>

          <FormField label="Product Name" required>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Brushless DC Motor 24V"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category" required>
              <Select
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Unit of Measurement (UOM)" required>
              <Select
                value={formData.uom}
                onChange={e => setFormData({ ...formData, uom: e.target.value })}
              >
                <option value="EACH">EACH (Single unit)</option>
                <option value="PIECE">PIECE</option>
                <option value="BOX">BOX</option>
                <option value="CARTON">CARTON</option>
                <option value="PALLET">PALLET</option>
                <option value="KILOGRAM">KILOGRAM</option>
                <option value="LITER">LITER</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Cost Price ($)" required>
              <Input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                required
              />
            </FormField>

            <FormField label="Selling Price ($)" required>
              <Input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Reorder Threshold" required helperText="Alerts trigger when stock falls below this">
              <Input
                type="number"
                value={formData.reorderPoint}
                onChange={e => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                required
              />
            </FormField>

            <FormField label="Weight (kg)">
              <Input
                type="number"
                step="0.01"
                value={formData.weightKg}
                onChange={e => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Product: ${formData.sku}`}
        description="Update pricing, thresholds, or catalog properties."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleEditSubmit} isLoading={actionLoading}>
              Update Product
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          {error && <Alert type="error" message={error} className="mb-2" />}
          <FormField label="Product Name" required>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Cost Price ($)">
              <Input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Selling Price ($)">
              <Input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Reorder Threshold">
              <Input
                type="number"
                value={formData.reorderPoint}
                onChange={e => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Status">
              <Select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={e => setFormData({ ...formData, isActive: e.target.value === 'active' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION MODAL FOR DELETION */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Safe Deactivation"
        description="Are you sure you want to remove this product?"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleDeleteConfirm} isLoading={actionLoading}>
              Deactivate Product
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            You are deactivating SKU <span className="font-mono font-bold text-white">{selectedProduct?.sku}</span> ({selectedProduct?.name}).
          </p>
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-400" />
            Historical movements and inventory balance records will be preserved for compliance. The item will no longer appear in outbound sales allocations.
          </div>
        </div>
      </Modal>
    </div>
  );
};
