import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  PackageCheck,
  History,
  Send,
  Ban,
  Boxes,
  FileCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  getGoodsReceipts,
  confirmGoodsReceipt,
  PurchaseOrder,
  GoodsReceipt
} from '../api/purchasing';
import { getSuppliers, getWarehouses, getProducts, getLocations } from '../api/masterData';

export const ReceivingPage: React.FC = () => {
  // View & Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'partial' | 'completed' | 'drafts'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [allReceipts, setAllReceipts] = useState<GoodsReceipt[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);

  // Selected PO for Details or Receiving
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [isPODetailsModalOpen, setIsPODetailsModalOpen] = useState(false);
  const [isReceiptsHistoryModalOpen, setIsReceiptsHistoryModalOpen] = useState(false);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Goods Receipt Form Model
  const [receiptForm, setReceiptForm] = useState({
    carrierName: '',
    trackingNumber: '',
    billOfLading: '',
    notes: '',
    items: [] as Array<{
      poLineItemId: string;
      productId: string;
      productName: string;
      sku: string;
      quantityOrdered: number;
      quantityReceived: number;
      remainingToReceive: number;
      locationId: string;
      quantityAccepted: number;
      quantityRejected: number;
      batchNumber: string;
      rejectionReason: string;
    }>
  });

  // Create PO Form Model
  const [poForm, setPoForm] = useState({
    supplierId: '',
    warehouseId: 'wh-01',
    expectedDate: '',
    notes: '',
    lineItems: [
      { productId: '', quantityOrdered: 50, unitCost: 10.0 }
    ]
  });

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, receiptsRes, suppRes, whRes, prodsRes] = await Promise.all([
        getPurchaseOrders({ limit: 100 }),
        getGoodsReceipts({ limit: 50 }),
        getSuppliers(),
        getWarehouses(),
        getProducts({ limit: 100 })
      ]);

      setPurchaseOrders(posRes.items || []);
      setAllReceipts(receiptsRes.data || []);
      setSuppliersList(suppRes.data || []);
      setWarehousesList(whRes.data || []);
      setProductsList(prodsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Purchase Orders
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.notes && po.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeTab === 'ready') return po.status === 'SUBMITTED';
    if (activeTab === 'partial') return po.status === 'PARTIALLY_RECEIVED';
    if (activeTab === 'completed') return po.status === 'FULLY_RECEIVED';
    if (activeTab === 'drafts') return po.status === 'DRAFT';
    return true;
  });

  // Open Receiving Modal for PO
  const handleOpenReceivingModal = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setFormError(null);

    // Fetch warehouse locations
    try {
      const locRes = await getLocations({ warehouseId: po.warehouseId, limit: 100 });
      setLocationsList(locRes.data || []);
    } catch {
      setLocationsList([]);
    }

    // Initialize line receiving state
    const defaultLocationId = 'loc-01'; // Default dock staging bin
    const items = po.lineItems.map(l => {
      const remaining = Math.max(0, l.quantityOrdered - l.quantityReceived);
      return {
        poLineItemId: l.id,
        productId: l.productId,
        productName: l.product?.name || 'Product',
        sku: l.product?.sku || 'SKU',
        quantityOrdered: l.quantityOrdered,
        quantityReceived: l.quantityReceived,
        remainingToReceive: remaining,
        locationId: defaultLocationId,
        quantityAccepted: remaining, // Pre-fill with remaining
        quantityRejected: 0,
        batchNumber: `LOT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        rejectionReason: ''
      };
    });

    setReceiptForm({
      carrierName: '',
      trackingNumber: '',
      billOfLading: '',
      notes: '',
      items
    });

    setIsReceivingModalOpen(true);
  };

  // Submit Goods Receipt
  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    setFormLoading(true);
    setFormError(null);

    // Validate over-receiving before submit
    for (const item of receiptForm.items) {
      if (item.quantityAccepted + item.quantityRejected <= 0) continue;
      if (item.quantityAccepted + item.quantityRejected > item.remainingToReceive) {
        setFormError(
          `Over-receiving blocked for ${item.sku}. Remaining to receive: ${item.remainingToReceive}, Attempted: ${
            item.quantityAccepted + item.quantityRejected
          }`
        );
        setFormLoading(false);
        return;
      }
      if (item.quantityRejected > 0 && (!item.rejectionReason || item.rejectionReason.length < 3)) {
        setFormError(`Please provide a rejection explanation for rejected units of ${item.sku}.`);
        setFormLoading(false);
        return;
      }
    }

    // Filter out items with 0 receiving
    const itemsToReceive = receiptForm.items
      .filter(i => i.quantityAccepted + i.quantityRejected > 0)
      .map(i => ({
        poLineItemId: i.poLineItemId,
        productId: i.productId,
        locationId: i.locationId,
        quantityAccepted: Number(i.quantityAccepted),
        quantityRejected: Number(i.quantityRejected),
        batchNumber: i.batchNumber || undefined,
        rejectionReason: i.rejectionReason || undefined
      }));

    if (itemsToReceive.length === 0) {
      setFormError('Please enter at least one item with accepted or rejected quantity greater than zero.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await confirmGoodsReceipt({
        purchaseOrderId: selectedPO.id,
        warehouseId: selectedPO.warehouseId,
        carrierName: receiptForm.carrierName || undefined,
        trackingNumber: receiptForm.trackingNumber || undefined,
        billOfLading: receiptForm.billOfLading || undefined,
        notes: receiptForm.notes || undefined,
        items: itemsToReceive
      });

      setSuccessMsg(
        `Goods Receipt Note ${res.data.receipt.receiptNumber} successfully confirmed! Inventory balances updated.`
      );
      setIsReceivingModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to confirm goods receipt');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Draft PO to Supplier
  const handleIssuePO = async (poId: string) => {
    setLoading(true);
    try {
      await updatePurchaseOrderStatus(poId, 'SUBMITTED', 'Issued to supplier for fulfillment');
      setSuccessMsg('Purchase Order status updated to SUBMITTED. Ready for dock receiving.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit purchase order');
      setLoading(false);
    }
  };

  // Cancel PO
  const handleCancelPO = async (poId: string) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;
    setLoading(true);
    try {
      await updatePurchaseOrderStatus(poId, 'CANCELLED', 'Cancelled by warehouse management');
      setSuccessMsg('Purchase Order cancelled.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel purchase order');
      setLoading(false);
    }
  };

  // View PO Details
  const handleOpenDetails = async (poId: string) => {
    try {
      const res = await getPurchaseOrderById(poId);
      setSelectedPO(res.data);
      setIsPODetailsModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add line to PO form
  const handleAddPOLine = () => {
    setPoForm({
      ...poForm,
      lineItems: [
        ...poForm.lineItems,
        { productId: productsList[0]?.id || '', quantityOrdered: 50, unitCost: 10.0 }
      ]
    });
  };

  // Remove line from PO form
  const handleRemovePOLine = (index: number) => {
    if (poForm.lineItems.length <= 1) return;
    const updated = [...poForm.lineItems];
    updated.splice(index, 1);
    setPoForm({ ...poForm, lineItems: updated });
  };

  // Create PO Submit
  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await createPurchaseOrder({
        supplierId: poForm.supplierId,
        warehouseId: poForm.warehouseId,
        expectedDate: poForm.expectedDate ? new Date(poForm.expectedDate).toISOString() : undefined,
        notes: poForm.notes || undefined,
        lineItems: poForm.lineItems.map(l => ({
          productId: l.productId,
          quantityOrdered: Number(l.quantityOrdered),
          unitCost: Number(l.unitCost)
        }))
      });

      setSuccessMsg('New Purchase Order created in DRAFT status.');
      setIsCreatePOModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create purchase order');
    } finally {
      setFormLoading(false);
    }
  };

  // Compute PO Form Total
  const poFormTotal = poForm.lineItems.reduce(
    (sum, l) => sum + Number(l.quantityOrdered || 0) * Number(l.unitCost || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowDownToLine className="w-6 h-6 text-brand-400" />
            Purchasing & Goods Receiving (GRN)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supplier purchase orders, dock intake verification, accepted vs. rejected inspection, and inventory posting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReceiptsHistoryModalOpen(true)}
            leftIcon={<History className="w-4 h-4 text-sky-400" />}
          >
            Receipt Notes ({allReceipts.length})
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setPoForm({
                supplierId: suppliersList[0]?.id || '',
                warehouseId: warehousesList[0]?.id || 'wh-01',
                expectedDate: '',
                notes: '',
                lineItems: [
                  { productId: productsList[0]?.id || '', quantityOrdered: 50, unitCost: 15.0 }
                ]
              });
              setFormError(null);
              setIsCreatePOModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <Alert type="error" title="Error" message={error} onDismiss={() => setError(null)} />
      )}
      {successMsg && (
        <Alert type="success" title="Success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Purchase Orders</div>
            <div className="text-xl font-bold text-white mt-1">{purchaseOrders.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active catalog orders</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Awaiting Intake</div>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {purchaseOrders.filter(p => p.status === 'SUBMITTED').length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Submitted to vendors</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-sky-400 uppercase tracking-wider">Partial Deliveries</div>
            <div className="text-xl font-bold text-sky-400 mt-1">
              {purchaseOrders.filter(p => p.status === 'PARTIALLY_RECEIVED').length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">In-flight split shipments</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Goods Receipts (GRN)</div>
            <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
              {allReceipts.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Confirmed dock intakes</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Orders ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'ready'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Ready to Receive ({purchaseOrders.filter(p => p.status === 'SUBMITTED').length})
            </button>
            <button
              onClick={() => setActiveTab('partial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'partial'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Partially Received ({purchaseOrders.filter(p => p.status === 'PARTIALLY_RECEIVED').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Fully Received ({purchaseOrders.filter(p => p.status === 'FULLY_RECEIVED').length})
            </button>
            <button
              onClick={() => setActiveTab('drafts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'drafts'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Drafts ({purchaseOrders.filter(p => p.status === 'DRAFT').length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full sm:w-72">
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search PO #, supplier, notes..."
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              title="Refresh"
              aria-label="Refresh data"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Purchase Orders Table */}
      {!loading && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number & Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Line Items</TableHead>
                  <TableHead>Receiving Progress</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      No purchase orders found matching current criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map(po => {
                    const totalOrdered = po.lineItems.reduce((sum, l) => sum + l.quantityOrdered, 0);
                    const totalReceived = po.lineItems.reduce((sum, l) => sum + l.quantityReceived, 0);
                    const progressPercent = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;

                    return (
                      <TableRow key={po.id}>
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-brand-400">{po.poNumber}</div>
                          <div className="text-xs text-white font-medium">{po.supplier?.name || po.supplierId}</div>
                          <div className="text-[10px] text-slate-400">Code: {po.supplier?.code}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {po.warehouse?.name || po.warehouseId}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 font-mono">
                          {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {po.lineItems.length} lines
                        </TableCell>
                        <TableCell>
                          <div className="w-36">
                            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                              <span>{totalReceived} / {totalOrdered}</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  progressPercent === 100
                                    ? 'bg-emerald-500'
                                    : progressPercent > 0
                                    ? 'bg-sky-500'
                                    : 'bg-slate-600'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-white">
                          ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {po.status === 'DRAFT' && (
                            <Badge variant="neutral" size="sm">
                              DRAFT
                            </Badge>
                          )}
                          {po.status === 'SUBMITTED' && (
                            <Badge variant="warning" size="sm" dot>
                              SUBMITTED
                            </Badge>
                          )}
                          {po.status === 'PARTIALLY_RECEIVED' && (
                            <Badge variant="info" size="sm" dot>
                              PARTIAL
                            </Badge>
                          )}
                          {po.status === 'FULLY_RECEIVED' && (
                            <Badge variant="success" size="sm" dot>
                              RECEIVED
                            </Badge>
                          )}
                          {po.status === 'CANCELLED' && (
                            <Badge variant="danger" size="sm">
                              CANCELLED
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Receive Goods Action */}
                            {(po.status === 'SUBMITTED' || po.status === 'PARTIALLY_RECEIVED') && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenReceivingModal(po)}
                                leftIcon={<ArrowDownToLine className="w-3.5 h-3.5" />}
                              >
                                Receive
                              </Button>
                            )}

                            {/* Issue Draft Action */}
                            {po.status === 'DRAFT' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIssuePO(po.id)}
                                leftIcon={<Send className="w-3.5 h-3.5 text-amber-400" />}
                              >
                                Submit
                              </Button>
                            )}

                            {/* View Details */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetails(po.id)}
                              title="View lines and receipt history"
                            >
                              Details
                            </Button>

                            {/* Cancel PO (if draft or submitted with no receipts) */}
                            {po.status === 'DRAFT' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelPO(po.id)}
                                title="Cancel PO"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-400" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: RECEIVE GOODS (DOCK INTAKE & QUALITY CONTROL) */}
      <Modal
        isOpen={isReceivingModalOpen}
        onClose={() => setIsReceivingModalOpen(false)}
        title={`Goods Receipt (GRN) Intake — PO: ${selectedPO?.poNumber}`}
      >
        <form onSubmit={handleConfirmReceipt} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex justify-between text-xs">
            <div>
              <span className="text-slate-400">Supplier:</span>{' '}
              <span className="text-white font-medium">{selectedPO?.supplier?.name}</span>
            </div>
            <div>
              <span className="text-slate-400">Warehouse:</span>{' '}
              <span className="text-white font-medium">{selectedPO?.warehouse?.name}</span>
            </div>
            <div>
              <span className="text-slate-400">PO Status:</span>{' '}
              <span className="text-amber-400 font-semibold">{selectedPO?.status}</span>
            </div>
          </div>

          {/* Carrier & Delivery Info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Carrier Name</label>
              <Input
                placeholder="e.g. DHL, FedEx"
                value={receiptForm.carrierName}
                onChange={e => setReceiptForm({ ...receiptForm, carrierName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tracking Number</label>
              <Input
                placeholder="TRK-9901824"
                value={receiptForm.trackingNumber}
                onChange={e => setReceiptForm({ ...receiptForm, trackingNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Bill of Lading (BOL)</label>
              <Input
                placeholder="BOL-5541"
                value={receiptForm.billOfLading}
                onChange={e => setReceiptForm({ ...receiptForm, billOfLading: e.target.value })}
              />
            </div>
          </div>

          {/* Line items verification */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-200 border-b border-slate-800 pb-1">
              Verify Product Lines & Assign Storage Bins
            </div>

            {receiptForm.items.map((item, index) => (
              <div key={item.poLineItemId} className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-400">{item.sku}</span>
                    <span className="text-xs text-white font-medium ml-2">{item.productName}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Ordered: <span className="text-white">{item.quantityOrdered}</span> | Received:{' '}
                    <span className="text-sky-400">{item.quantityReceived}</span> | Remaining:{' '}
                    <span className="text-amber-400 font-bold">{item.remainingToReceive}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-400 mb-1">Accepted Qty *</label>
                    <Input
                      type="number"
                      min="0"
                      max={item.remainingToReceive}
                      value={item.quantityAccepted}
                      onChange={e => {
                        const val = Number(e.target.value);
                        const updated = [...receiptForm.items];
                        updated[index].quantityAccepted = val;
                        setReceiptForm({ ...receiptForm, items: updated });
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-rose-400 mb-1">Rejected Qty (Damaged)</label>
                    <Input
                      type="number"
                      min="0"
                      max={item.remainingToReceive - item.quantityAccepted}
                      value={item.quantityRejected}
                      onChange={e => {
                        const val = Number(e.target.value);
                        const updated = [...receiptForm.items];
                        updated[index].quantityRejected = val;
                        setReceiptForm({ ...receiptForm, items: updated });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Assign Storage Bin *</label>
                    <select
                      value={item.locationId}
                      onChange={e => {
                        const updated = [...receiptForm.items];
                        updated[index].locationId = e.target.value;
                        setReceiptForm({ ...receiptForm, items: updated });
                      }}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      {locationsList.map(l => (
                        <option key={l.id} value={l.id} disabled={l.isLocked}>
                          {l.barcode} {l.isLocked ? '(Locked)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Batch / Lot #</label>
                    <Input
                      placeholder="LOT-2026-X"
                      value={item.batchNumber}
                      onChange={e => {
                        const updated = [...receiptForm.items];
                        updated[index].batchNumber = e.target.value;
                        setReceiptForm({ ...receiptForm, items: updated });
                      }}
                    />
                  </div>
                </div>

                {/* Conditional Rejection Reason */}
                {item.quantityRejected > 0 && (
                  <div>
                    <label className="block text-[11px] font-medium text-rose-400 mb-1">
                      Quality Rejection Explanation (Required) *
                    </label>
                    <Input
                      placeholder="e.g. Broken seal, damaged packaging during freight"
                      value={item.rejectionReason}
                      onChange={e => {
                        const updated = [...receiptForm.items];
                        updated[index].rejectionReason = e.target.value;
                        setReceiptForm({ ...receiptForm, items: updated });
                      }}
                      required
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Receiving Dock Notes</label>
            <Input
              placeholder="Dock conditions, unloading remarks..."
              value={receiptForm.notes}
              onChange={e => setReceiptForm({ ...receiptForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsReceivingModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formLoading}>
              Confirm Goods Receipt & Book Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CREATE PURCHASE ORDER */}
      <Modal
        isOpen={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        title="Create Purchase Order"
      >
        <form onSubmit={handleCreatePOSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Supplier *</label>
              <select
                value={poForm.supplierId}
                onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Supplier...</option>
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Receiving Warehouse *</label>
              <select
                value={poForm.warehouseId}
                onChange={e => setPoForm({ ...poForm, warehouseId: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {warehousesList.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Expected Delivery Date</label>
              <Input
                type="date"
                value={poForm.expectedDate}
                onChange={e => setPoForm({ ...poForm, expectedDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Procurement Ref</label>
              <Input
                placeholder="Internal procurement remarks"
                value={poForm.notes}
                onChange={e => setPoForm({ ...poForm, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
              <span className="text-xs font-semibold text-slate-200">Line Items</span>
              <Button variant="ghost" size="sm" type="button" onClick={handleAddPOLine}>
                + Add Item
              </Button>
            </div>

            {poForm.lineItems.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="col-span-5">
                  <select
                    value={line.productId}
                    onChange={e => {
                      const updated = [...poForm.lineItems];
                      updated[index].productId = e.target.value;
                      const prod = productsList.find(p => p.id === e.target.value);
                      if (prod) updated[index].unitCost = prod.costPrice || 10.0;
                      setPoForm({ ...poForm, lineItems: updated });
                    }}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Select SKU...</option>
                    {productsList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={line.quantityOrdered}
                    onChange={e => {
                      const updated = [...poForm.lineItems];
                      updated[index].quantityOrdered = Number(e.target.value);
                      setPoForm({ ...poForm, lineItems: updated });
                    }}
                    required
                  />
                </div>

                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Cost ($)"
                    value={line.unitCost}
                    onChange={e => {
                      const updated = [...poForm.lineItems];
                      updated[index].unitCost = Number(e.target.value);
                      setPoForm({ ...poForm, lineItems: updated });
                    }}
                    required
                  />
                </div>

                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemovePOLine(index)}
                    className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center text-xs font-semibold text-slate-300 pt-2">
              <span>Estimated Total:</span>
              <span className="font-mono text-emerald-400 text-sm">
                ${poFormTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsCreatePOModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formLoading}>
              Save Draft PO
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: PO DETAILS & RECEIPT HISTORY */}
      <Modal
        isOpen={isPODetailsModalOpen}
        onClose={() => setIsPODetailsModalOpen(false)}
        title={`Purchase Order Details — ${selectedPO?.poNumber}`}
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <div>
                <span className="text-slate-400">Supplier:</span>
                <div className="text-white font-semibold mt-0.5">{selectedPO.supplier?.name}</div>
              </div>
              <div>
                <span className="text-slate-400">Receiving Warehouse:</span>
                <div className="text-white font-semibold mt-0.5">{selectedPO.warehouse?.name}</div>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <div className="mt-0.5">
                  <Badge
                    variant={
                      selectedPO.status === 'FULLY_RECEIVED'
                        ? 'success'
                        : selectedPO.status === 'PARTIALLY_RECEIVED'
                        ? 'info'
                        : selectedPO.status === 'SUBMITTED'
                        ? 'warning'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {selectedPO.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Line Items Breakdown */}
            <div>
              <h4 className="text-xs font-semibold text-white mb-2">Ordered Line Items</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU & Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPO.lineItems.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-brand-400">{l.product?.sku}</span>
                        <div className="text-xs text-white">{l.product?.name}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white">{l.quantityOrdered}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-sky-400 font-bold">{l.quantityReceived}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-400">{l.quantityAccepted}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-rose-400">{l.quantityRejected}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-300">${l.unitCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Goods Receipts Log for this PO */}
            {selectedPO.goodsReceipts && selectedPO.goodsReceipts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-white mb-2">Goods Receipts Log (GRN)</h4>
                <div className="space-y-2">
                  {selectedPO.goodsReceipts.map(grn => (
                    <div key={grn.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-brand-400 font-bold">{grn.receiptNumber}</span>
                        <span className="text-slate-400">{new Date(grn.receivedAt).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-300">
                        Carrier: <span className="text-white">{grn.carrierName || 'N/A'}</span> | Tracking:{' '}
                        <span className="font-mono text-sky-300">{grn.trackingNumber || 'N/A'}</span>
                      </div>
                      {grn.notes && <div className="text-slate-400 text-[11px] italic">"{grn.notes}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsPODetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 4: ALL GOODS RECEIPTS (GRN) LOG */}
      <Modal
        isOpen={isReceiptsHistoryModalOpen}
        onClose={() => setIsReceiptsHistoryModalOpen(false)}
        title="Confirmed Goods Receipt Notes (GRN) History"
      >
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN Number</TableHead>
                <TableHead>PO Reference</TableHead>
                <TableHead>Received At</TableHead>
                <TableHead>Carrier & Tracking</TableHead>
                <TableHead className="text-right">Items Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                    No goods receipts recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                allReceipts.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-bold text-brand-400">{r.receiptNumber}</TableCell>
                    <TableCell className="font-mono text-xs text-white">
                      {r.purchaseOrder?.poNumber || r.purchaseOrderId}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 font-mono">
                      {new Date(r.receivedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">
                      {r.carrierName || 'Direct'} {r.trackingNumber ? `(${r.trackingNumber})` : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">
                      {r.items?.length || 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsReceiptsHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
