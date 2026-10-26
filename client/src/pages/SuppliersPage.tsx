import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Building
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
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../api/masterData';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    leadTimeDays: 7,
    paymentTerms: 'Net 30',
    isActive: true
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSuppliers({ search: search || undefined });
      setSuppliers(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleOpenCreate = () => {
    setFormData({
      code: '',
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      leadTimeDays: 7,
      paymentTerms: 'Net 30',
      isActive: true
    });
    setError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (s: any) => {
    setSelectedSupplier(s);
    setFormData({
      code: s.code,
      name: s.name,
      contactName: s.contactName || '',
      email: s.email,
      phone: s.phone,
      address: s.address,
      city: s.city,
      country: s.country,
      leadTimeDays: s.leadTimeDays,
      paymentTerms: s.paymentTerms || 'Net 30',
      isActive: s.isActive
    });
    setError(null);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (s: any) => {
    setSelectedSupplier(s);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await createSupplier({
        ...formData,
        code: formData.code.toUpperCase(),
        leadTimeDays: Number(formData.leadTimeDays)
      });
      setIsCreateOpen(false);
      setSuccessMsg(`Supplier ${formData.name} registered successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create supplier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateSupplier(selectedSupplier.id, {
        ...formData,
        code: formData.code.toUpperCase(),
        leadTimeDays: Number(formData.leadTimeDays)
      });
      setIsEditOpen(false);
      setSuccessMsg(`Supplier ${formData.name} updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update supplier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupplier) return;
    setActionLoading(true);
    try {
      await deleteSupplier(selectedSupplier.id);
      setIsDeleteOpen(false);
      setSuccessMsg(`Supplier ${selectedSupplier.name} removed successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete supplier');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-brand-400" />
            Supplier Directory & Vendors
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Vendor management, procurement lead times, and contact information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadData}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            Add Supplier
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
              placeholder="Search vendor name, code, contact or email..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <div className="text-xs text-slate-400">
            Total Vendors: <span className="font-semibold text-white">{suppliers.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Loading supplier directory..." />
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No suppliers found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Company & Location</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email & Phone</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-bold text-brand-400">{s.code}</TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {s.city}, {s.country}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{s.contactName || '-'}</TableCell>
                    <TableCell className="text-[11px] text-slate-300">
                      <div>{s.email}</div>
                      <div className="text-slate-400">{s.phone}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-200">
                      {s.leadTimeDays} days
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{s.paymentTerms}</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? 'success' : 'danger'} size="sm" dot>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(s)}
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
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Supplier"
        description="Add a vendor to enable purchase orders and inbound receipts."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateSubmit} isLoading={actionLoading}>
              Save Supplier
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          {error && <Alert type="error" message={error} className="mb-2" />}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Supplier Code" required helperText="Unique code (e.g. SUP-004)">
              <Input
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUP-004"
                required
              />
            </FormField>

            <FormField label="Company Name" required>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Apex Fasteners Inc"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contact Person">
              <Input
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Jane Doe"
              />
            </FormField>

            <FormField label="Email Address" required>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="orders@vendor.com"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone Number" required>
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 0192"
                required
              />
            </FormField>

            <FormField label="Average Lead Time (Days)" required>
              <Input
                type="number"
                value={formData.leadTimeDays}
                onChange={e => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 1 })}
                required
              />
            </FormField>
          </div>

          <FormField label="Street Address" required>
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Industrial Blvd"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="City" required>
              <Input
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Chicago"
                required
              />
            </FormField>

            <FormField label="Country" required>
              <Input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                required
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Supplier: ${formData.name}`}
        description="Update contact information and terms."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleEditSubmit} isLoading={actionLoading}>
              Update Supplier
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          {error && <Alert type="error" message={error} className="mb-2" />}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Company Name" required>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Contact Person">
              <Input
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email" required>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Phone" required>
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Lead Time (Days)">
              <Input
                type="number"
                value={formData.leadTimeDays}
                onChange={e => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 1 })}
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

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Supplier"
        description="Are you sure you want to remove this vendor?"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleDeleteConfirm} isLoading={actionLoading}>
              Confirm Delete
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            You are deleting <span className="font-semibold text-white">{selectedSupplier?.name}</span> ({selectedSupplier?.code}).
          </p>
          <p className="text-slate-400">
            This action will remove the supplier record from the active directory.
          </p>
        </div>
      </Modal>
    </div>
  );
};
