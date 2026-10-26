import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  FolderTree,
  AlertTriangle,
  Package
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
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../api/masterData';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    parentId: ''
  });

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCategories();
      setCategories(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      parentId: ''
    });
    setError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setSelectedCat(c);
    setFormData({
      code: c.code,
      name: c.name,
      description: c.description || '',
      parentId: c.parentId || ''
    });
    setError(null);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (c: any) => {
    setSelectedCat(c);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await createCategory({
        ...formData,
        code: formData.code.toUpperCase(),
        parentId: formData.parentId || undefined
      });
      setIsCreateOpen(false);
      setSuccessMsg(`Category ${formData.name} created successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateCategory(selectedCat.id, {
        ...formData,
        code: formData.code.toUpperCase(),
        parentId: formData.parentId || undefined
      });
      setIsEditOpen(false);
      setSuccessMsg(`Category ${formData.name} updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCat) return;
    setActionLoading(true);
    try {
      await deleteCategory(selectedCat.id);
      setIsDeleteOpen(false);
      setSuccessMsg(`Category ${selectedCat.name} deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
      setIsDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-brand-400" />
            Product Categories & Taxonomy
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hierarchical product classifications and storage condition defaults
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadCategories}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            New Category
          </Button>
        </div>
      </div>

      {successMsg && <Alert type="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />}
      {error && !isCreateOpen && !isEditOpen && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search category name or code..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <div className="text-xs text-slate-400">
            Total Categories: <span className="font-semibold text-white">{categories.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Loading taxonomy categories..." />
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No categories found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Code</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Parent Category</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map(c => {
                  const parent = categories.find(p => p.id === c.parentId);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-bold text-brand-400">
                        <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                          {c.code}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-white">{c.name}</TableCell>
                      <TableCell className="text-xs text-slate-400 max-w-sm truncate">
                        {c.description || '-'}
                      </TableCell>
                      <TableCell>
                        {parent ? (
                          <Badge variant="purple" size="sm">
                            {parent.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Top-Level</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(c)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Product Category"
        description="Categories group products and determine storage classification."
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateSubmit} isLoading={actionLoading}>
              Save Category
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          {error && <Alert type="error" message={error} className="mb-2" />}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category Code" required helperText="e.g. ELEC">
              <Input
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="ELEC"
                required
              />
            </FormField>

            <FormField label="Category Name" required>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Electronics & Motors"
                required
              />
            </FormField>
          </div>

          <FormField label="Parent Category (Optional)" helperText="Leave empty for root categories">
            <Select
              value={formData.parentId}
              onChange={e => setFormData({ ...formData, parentId: e.target.value })}
            >
              <option value="">None (Top-Level Category)</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Description">
            <Input
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description of products in this category"
            />
          </FormField>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Category: ${formData.name}`}
        description="Update category name and parent hierarchy."
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleEditSubmit} isLoading={actionLoading}>
              Update Category
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          {error && <Alert type="error" message={error} className="mb-2" />}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category Code" required>
              <Input
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
            </FormField>

            <FormField label="Category Name" required>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label="Parent Category">
            <Select
              value={formData.parentId}
              onChange={e => setFormData({ ...formData, parentId: e.target.value })}
            >
              <option value="">None (Top-Level Category)</option>
              {categories
                .filter(c => c.id !== selectedCat?.id)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </FormField>

          <FormField label="Description">
            <Input
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Category Deletion"
        description="Check foreign key dependencies before deleting."
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleDeleteConfirm} isLoading={actionLoading}>
              Delete Category
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            You are deleting <span className="font-semibold text-white">{selectedCat?.name}</span> ({selectedCat?.code}).
          </p>
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-400" />
            Foreign Key Protection: If any products or sub-categories are assigned to this category, the deletion will be rejected.
          </div>
        </div>
      </Modal>
    </div>
  );
};
