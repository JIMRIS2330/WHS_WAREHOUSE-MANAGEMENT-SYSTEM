import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  History,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Scale
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
  getInventory,
  getInventorySummary,
  getStockMovements,
  stockIn,
  stockOut,
  stockTransfer,
  stockAdjustment,
  getValuationReport,
  getReconciliation,
  InventoryItem,
  StockMovement,
  InventorySummary
} from '../api/inventory';
import { getProducts, getWarehouses, getLocations } from '../api/masterData';

export const InventoryPage: React.FC = () => {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'balances' | 'movements' | 'valuation'>('balances');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [valuationData, setValuationData] = useState<any>(null);

  // Master data lookups for modals
  const [productsList, setProductsList] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);

  // Modals state
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isReconOpen, setIsReconOpen] = useState(false);
  const [reconResult, setReconResult] = useState<any>(null);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form models
  const [stockInForm, setStockInForm] = useState({
    productId: '',
    warehouseId: 'wh-01',
    locationId: '',
    quantity: 1,
    batchNumber: '',
    referenceType: 'PURCHASE_RECEIPT',
    referenceId: '',
    notes: ''
  });

  const [stockOutForm, setStockOutForm] = useState({
    productId: '',
    warehouseId: 'wh-01',
    locationId: '',
    quantity: 1,
    referenceType: 'CUSTOMER_DISPATCH',
    referenceId: '',
    notes: ''
  });

  const [transferForm, setTransferForm] = useState({
    productId: '',
    warehouseId: 'wh-01',
    sourceLocationId: '',
    destLocationId: '',
    quantity: 1,
    referenceId: '',
    notes: ''
  });

  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    warehouseId: 'wh-01',
    locationId: '',
    newQuantity: 0,
    currentQuantity: 0,
    reasonCode: 'CYCLE_COUNT_DISCREPANCY',
    notes: ''
  });

  // Load Inventory & Summary
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, sumRes, prodsRes, whRes] = await Promise.all([
        getInventory({
          warehouseId: selectedWarehouse || undefined,
          isLowStock: lowStockFilter ? true : undefined,
          search: searchTerm || undefined,
          limit: 100
        }),
        getInventorySummary(selectedWarehouse || undefined),
        getProducts({ limit: 100 }),
        getWarehouses()
      ]);

      setInventoryItems(invRes.items || []);
      setSummary(sumRes.data);
      setProductsList(prodsRes.data || []);
      setWarehousesList(whRes.data || []);

      const movRes = await getStockMovements({ limit: 50 });
      setMovements(movRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouse, lowStockFilter]);

  // Load locations when warehouse selection changes in forms
  const loadLocationsForWarehouse = async (whId: string) => {
    if (!whId) return;
    try {
      const res = await getLocations({ warehouseId: whId, limit: 100 });
      setLocationsList(res.data || []);
    } catch {
      setLocationsList([]);
    }
  };

  useEffect(() => {
    loadLocationsForWarehouse(stockInForm.warehouseId || 'wh-01');
  }, [stockInForm.warehouseId, isStockInOpen, isStockOutOpen, isTransferOpen, isAdjustmentOpen]);

  // Load valuation when valuation tab selected
  const handleTabChange = async (tab: 'balances' | 'movements' | 'valuation') => {
    setActiveTab(tab);
    if (tab === 'valuation') {
      try {
        const val = await getValuationReport();
        setValuationData(val.data);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // Stock-In Submit
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await stockIn({
        productId: stockInForm.productId,
        warehouseId: stockInForm.warehouseId,
        locationId: stockInForm.locationId,
        quantity: Number(stockInForm.quantity),
        batchNumber: stockInForm.batchNumber || undefined,
        referenceType: stockInForm.referenceType,
        referenceId: stockInForm.referenceId || undefined,
        notes: stockInForm.notes || undefined
      });
      setSuccessMsg(`Stock-in executed successfully: +${stockInForm.quantity} units received`);
      setIsStockInOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Stock-in failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Stock-Out Submit
  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await stockOut({
        productId: stockOutForm.productId,
        warehouseId: stockOutForm.warehouseId,
        locationId: stockOutForm.locationId,
        quantity: Number(stockOutForm.quantity),
        referenceType: stockOutForm.referenceType,
        referenceId: stockOutForm.referenceId || undefined,
        notes: stockOutForm.notes || undefined
      });
      setSuccessMsg(`Stock-out executed successfully: -${stockOutForm.quantity} units dispatched`);
      setIsStockOutOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Stock-out failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Transfer Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await stockTransfer({
        productId: transferForm.productId,
        warehouseId: transferForm.warehouseId,
        sourceLocationId: transferForm.sourceLocationId,
        destLocationId: transferForm.destLocationId,
        quantity: Number(transferForm.quantity),
        referenceId: transferForm.referenceId || undefined,
        notes: transferForm.notes || undefined
      });
      setSuccessMsg(`Internal transfer completed: ${transferForm.quantity} units relocated`);
      setIsTransferOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Transfer failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Adjustment Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await stockAdjustment({
        productId: adjustForm.productId,
        warehouseId: adjustForm.warehouseId,
        locationId: adjustForm.locationId,
        newQuantity: Number(adjustForm.newQuantity),
        reasonCode: adjustForm.reasonCode,
        notes: adjustForm.notes
      });
      setSuccessMsg(`Stock adjusted to ${adjustForm.newQuantity} units (Audit ledger recorded)`);
      setIsAdjustmentOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Adjustment failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Reconcile Balances
  const handleRunReconciliation = async (productId: string, warehouseId: string) => {
    setLoading(true);
    try {
      const res = await getReconciliation(productId, warehouseId);
      setReconResult({ ...res.data, productId, warehouseId });
      setIsReconOpen(true);
    } catch (err: any) {
      setError(err.message || 'Reconciliation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-brand-400" />
            Core Inventory Engine & Stock Ledgers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Triple-state balance tracking (On-Hand, Reserved, Available), atomic transfers, audited adjustments, and FIFO/Moving-Avg valuation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsStockInOpen(true);
            }}
            leftIcon={<ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
          >
            Stock In
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsStockOutOpen(true);
            }}
            leftIcon={<ArrowUpRight className="w-4 h-4 text-rose-400" />}
          >
            Stock Out
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsTransferOpen(true);
            }}
            leftIcon={<ArrowRightLeft className="w-4 h-4 text-sky-400" />}
          >
            Transfer Bin
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsAdjustmentOpen(true);
            }}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          >
            Adjust Stock
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

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active SKUs</div>
              <div className="text-lg font-bold text-white mt-1">{summary.totalSkus}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Catalog variety</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Physical On-Hand</div>
              <div className="text-lg font-bold text-white mt-1 font-mono">
                {summary.totalOnHand.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Total physically in bins</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-amber-400/90 uppercase tracking-wider">Reserved Stock</div>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">
                {summary.totalReserved.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Allocated to pending orders</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-emerald-400/90 uppercase tracking-wider">Available (ATP)</div>
              <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                {summary.totalAvailable.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">On-Hand minus Reserved</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-brand-400 uppercase tracking-wider">Inventory Asset Value</div>
              <div className="text-lg font-bold text-brand-400 mt-1 font-mono">
                ${summary.totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Cost price valuation</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="p-3">
              <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Low Stock Alerts</div>
              <div className="text-lg font-bold text-rose-400 mt-1 flex items-center gap-1.5">
                {summary.lowStockCount}
                {summary.lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Below reorder threshold</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs & Search Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => handleTabChange('balances')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'balances'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Bin Balances ({inventoryItems.length})
            </button>
            <button
              onClick={() => handleTabChange('movements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'movements'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Stock Movement Ledger ({movements.length})
            </button>
            <button
              onClick={() => handleTabChange('valuation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'valuation'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Valuation Breakdown
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                lowStockFilter
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Only
            </button>

            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
              aria-label="Filter by Warehouse"
              className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Warehouses</option>
              {warehousesList.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>

            <div className="w-full sm:w-60">
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search SKU, name, bin..."
                leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
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

      {/* Loading Indicator */}
      {loading && (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* TAB 1: BIN BALANCES TABLE */}
      {!loading && activeTab === 'balances' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU & Product Name</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Storage Bin</TableHead>
                  <TableHead className="text-right">On-Hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available ATP</TableHead>
                  <TableHead>Batch / Lot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      No inventory balances found matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-mono text-xs font-bold text-brand-400">
                          {item.product?.sku || 'UNKNOWN'}
                        </div>
                        <div className="text-xs text-white font-medium">{item.product?.name}</div>
                        <div className="text-[10px] text-slate-400">
                          UOM: {item.product?.uom} | Reorder: {item.product?.reorderPoint}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {item.warehouse?.name || item.warehouseId}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                          {item.location?.barcode || item.locationId}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-white">
                        {item.quantityOnHand.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-400">
                        {item.quantityReserved > 0 ? `${item.quantityReserved.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">
                        {item.quantityAvailable.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-400">
                        {item.batchNumber || '-'}
                      </TableCell>
                      <TableCell>
                        {item.isLowStock ? (
                          <Badge variant="warning" size="sm" dot>
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm" dot>
                            Sufficient
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRunReconciliation(item.productId, item.warehouseId)}
                          title="Verify mathematical ledger reconciliation"
                          leftIcon={<Scale className="w-3.5 h-3.5 text-slate-400 hover:text-brand-400" />}
                        >
                          Reconcile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: STOCK MOVEMENT LEDGER */}
      {!loading && activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Immutable Stock Movement Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Product / SKU</TableHead>
                  <TableHead>Route (From &rarr; To)</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead>Reference / Reason</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      No stock movements recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {m.movementType === 'STOCK_IN' && (
                          <Badge variant="success" size="sm">
                            STOCK IN
                          </Badge>
                        )}
                        {m.movementType === 'STOCK_OUT' && (
                          <Badge variant="danger" size="sm">
                            STOCK OUT
                          </Badge>
                        )}
                        {m.movementType === 'TRANSFER' && (
                          <Badge variant="info" size="sm">
                            BIN TRANSFER
                          </Badge>
                        )}
                        {m.movementType === 'ADJUSTMENT_INCREASE' && (
                          <Badge variant="purple" size="sm">
                            ADJUST (+{m.quantity})
                          </Badge>
                        )}
                        {m.movementType === 'ADJUSTMENT_DECREASE' && (
                          <Badge variant="warning" size="sm">
                            ADJUST (-{m.quantity})
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold text-brand-300">
                          {m.product?.sku || m.productId}
                        </div>
                        <div className="text-[11px] text-slate-300">{m.product?.name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {m.sourceLocation?.barcode || m.sourceLocationId || 'VENDOR'} &rarr;{' '}
                        {m.destLocation?.barcode || m.destLocationId || 'DISPATCH'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-white">
                        {m.movementType === 'STOCK_OUT' || m.movementType === 'ADJUSTMENT_DECREASE' ? '-' : '+'}
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-300">
                        {m.newOnHand}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        <span className="font-mono text-[11px] text-brand-400">
                          {m.referenceId || m.referenceType || 'N/A'}
                        </span>
                        {m.reasonCode && (
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">{m.reasonCode}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 max-w-xs truncate">
                        {m.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: INVENTORY VALUATION BREAKDOWN */}
      {!loading && activeTab === 'valuation' && (
        <div className="space-y-4">
          {valuationData && (
            <>
              <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg">
                <div>
                  <h3 className="text-sm font-semibold text-white">Cumulative Inventory Asset Value</h3>
                  <p className="text-xs text-slate-400">Calculated using Moving Average / Documented Costing Method</p>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  ${valuationData.totalInventoryValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU & Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total On-Hand</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Valuation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valuationData.items?.map((item: any) => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-brand-400">{item.sku}</span>
                            <div className="text-xs text-white">{item.name}</div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300">{item.category}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-white">
                            {item.onHand.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-300">
                            ${item.unitCost?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">
                            ${item.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* MODAL 1: STOCK-IN (RECEIVING) */}
      <Modal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        title="Stock In - Inbound Goods Intake"
      >
        <form onSubmit={handleStockInSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Product *</label>
            <select
              value={stockInForm.productId}
              onChange={e => setStockInForm({ ...stockInForm, productId: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Product...</option>
              {productsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Warehouse *</label>
              <select
                value={stockInForm.warehouseId}
                onChange={e => {
                  setStockInForm({ ...stockInForm, warehouseId: e.target.value });
                  loadLocationsForWarehouse(e.target.value);
                }}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {warehousesList.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Destination Bin *</label>
              <select
                value={stockInForm.locationId}
                onChange={e => setStockInForm({ ...stockInForm, locationId: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Bin...</option>
                {locationsList.map(l => (
                  <option key={l.id} value={l.id} disabled={l.isLocked}>
                    {l.barcode} {l.isLocked ? '(Locked)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Quantity Received *</label>
              <Input
                type="number"
                min="1"
                value={stockInForm.quantity}
                onChange={e => setStockInForm({ ...stockInForm, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Batch / Lot Number</label>
              <Input
                placeholder="LOT-2026-X1"
                value={stockInForm.batchNumber}
                onChange={e => setStockInForm({ ...stockInForm, batchNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reference Type</label>
              <select
                value={stockInForm.referenceType}
                onChange={e => setStockInForm({ ...stockInForm, referenceType: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="PURCHASE_RECEIPT">Purchase Order (PO)</option>
                <option value="CUSTOMER_RETURN">Customer Return</option>
                <option value="PRODUCTION_INTAKE">Production Intake</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reference ID / PO #</label>
              <Input
                placeholder="PO-2026-001"
                value={stockInForm.referenceId}
                onChange={e => setStockInForm({ ...stockInForm, referenceId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
            <Input
              placeholder="Delivery notes, carrier tracking..."
              value={stockInForm.notes}
              onChange={e => setStockInForm({ ...stockInForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsStockInOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formLoading}>
              Confirm Stock-In
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: STOCK-OUT (DISPATCH) */}
      <Modal
        isOpen={isStockOutOpen}
        onClose={() => setIsStockOutOpen(false)}
        title="Stock Out - Outbound Dispatch & Negative Stock Guard"
      >
        <form onSubmit={handleStockOutSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Product *</label>
            <select
              value={stockOutForm.productId}
              onChange={e => setStockOutForm({ ...stockOutForm, productId: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Product...</option>
              {productsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Warehouse *</label>
              <select
                value={stockOutForm.warehouseId}
                onChange={e => {
                  setStockOutForm({ ...stockOutForm, warehouseId: e.target.value });
                  loadLocationsForWarehouse(e.target.value);
                }}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {warehousesList.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Source Bin *</label>
              <select
                value={stockOutForm.locationId}
                onChange={e => setStockOutForm({ ...stockOutForm, locationId: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Bin...</option>
                {locationsList.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.barcode}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Quantity to Dispatch *</label>
              <Input
                type="number"
                min="1"
                value={stockOutForm.quantity}
                onChange={e => setStockOutForm({ ...stockOutForm, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sales Order / Dispatch Ref</label>
              <Input
                placeholder="SO-2026-0044"
                value={stockOutForm.referenceId}
                onChange={e => setStockOutForm({ ...stockOutForm, referenceId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
            <Input
              placeholder="Outbound notes..."
              value={stockOutForm.notes}
              onChange={e => setStockOutForm({ ...stockOutForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsStockOutOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={formLoading}>
              Dispatch Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: BIN-TO-BIN TRANSFER */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Bin-to-Bin Internal Relocation"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Product *</label>
            <select
              value={transferForm.productId}
              onChange={e => setTransferForm({ ...transferForm, productId: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Product...</option>
              {productsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Source Bin (From) *</label>
              <select
                value={transferForm.sourceLocationId}
                onChange={e => setTransferForm({ ...transferForm, sourceLocationId: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Source Bin...</option>
                {locationsList.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.barcode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Bin (To) *</label>
              <select
                value={transferForm.destLocationId}
                onChange={e => setTransferForm({ ...transferForm, destLocationId: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Target Bin...</option>
                {locationsList
                  .filter(l => l.id !== transferForm.sourceLocationId)
                  .map(l => (
                    <option key={l.id} value={l.id} disabled={l.isLocked}>
                      {l.barcode} {l.isLocked ? '(Locked)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Transfer Quantity *</label>
            <Input
              type="number"
              min="1"
              value={transferForm.quantity}
              onChange={e => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Transfer Reason / Notes</label>
            <Input
              placeholder="e.g., Replenishing forward pick-face"
              value={transferForm.notes}
              onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsTransferOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formLoading}>
              Execute Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: STOCK ADJUSTMENT */}
      <Modal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        title="Stock Adjustment (Audited Reason-Coded)"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Product *</label>
            <select
              value={adjustForm.productId}
              onChange={e => {
                const pid = e.target.value;
                setAdjustForm({ ...adjustForm, productId: pid });
                const existing = inventoryItems.find(
                  i => i.productId === pid && i.locationId === adjustForm.locationId
                );
                if (existing) {
                  setAdjustForm(prev => ({
                    ...prev,
                    productId: pid,
                    currentQuantity: existing.quantityOnHand,
                    newQuantity: existing.quantityOnHand
                  }));
                }
              }}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Product...</option>
              {productsList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Storage Bin *</label>
              <select
                value={adjustForm.locationId}
                onChange={e => {
                  const locId = e.target.value;
                  const existing = inventoryItems.find(
                    i => i.productId === adjustForm.productId && i.locationId === locId
                  );
                  setAdjustForm({
                    ...adjustForm,
                    locationId: locId,
                    currentQuantity: existing ? existing.quantityOnHand : 0,
                    newQuantity: existing ? existing.quantityOnHand : 0
                  });
                }}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Bin...</option>
                {locationsList.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.barcode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Physical Count *</label>
              <Input
                type="number"
                min="0"
                value={adjustForm.newQuantity}
                onChange={e => setAdjustForm({ ...adjustForm, newQuantity: Number(e.target.value) })}
                required
              />
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Current: {adjustForm.currentQuantity} | Delta:{' '}
                <span
                  className={
                    adjustForm.newQuantity - adjustForm.currentQuantity >= 0
                      ? 'text-emerald-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
                  {adjustForm.newQuantity - adjustForm.currentQuantity >= 0 ? '+' : ''}
                  {adjustForm.newQuantity - adjustForm.currentQuantity}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Mandatory Reason Code *</label>
            <select
              value={adjustForm.reasonCode}
              onChange={e => setAdjustForm({ ...adjustForm, reasonCode: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="CYCLE_COUNT_DISCREPANCY">Cycle Count Discrepancy</option>
              <option value="DAMAGED_GOODS">Damaged Goods / Packaging Defect</option>
              <option value="EXPIRED_STOCK">Expired Stock</option>
              <option value="THEFT_OR_SHRINKAGE">Theft or Shrinkage</option>
              <option value="FOUND_STOCK">Found Stock / Bin Re-identification</option>
              <option value="DATA_ENTRY_CORRECTION">Data Entry Correction</option>
              <option value="SCRAP">Scrap / Write-off</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Audit Explanation Notes (Min 3 characters) *
            </label>
            <Input
              placeholder="e.g. Discrepancy identified during Aisle 02 weekly cycle audit"
              value={adjustForm.notes}
              onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsAdjustmentOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formLoading}>
              Apply Audited Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: RECONCILIATION RESULT */}
      <Modal
        isOpen={isReconOpen}
        onClose={() => setIsReconOpen(false)}
        title="Stock Ledger Mathematical Reconciliation Audit"
      >
        {reconResult && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                reconResult.reconciled
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {reconResult.reconciled ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <div className="text-sm font-semibold">
                  {reconResult.reconciled
                    ? 'Perfect Mathematical Reconciliation'
                    : 'Reconciliation Discrepancy Detected'}
                </div>
                <div className="text-xs mt-0.5 text-slate-300">
                  {reconResult.reconciled
                    ? 'The sum of all historical immutable stock movements exactly equals current bin physical balances.'
                    : 'A non-zero variance was detected between historical movement entries and the physical balance table.'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono">
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Physical On-Hand</div>
                <div className="text-base font-bold text-white mt-1">{reconResult.physicalOnHand}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Ledger Sum</div>
                <div className="text-base font-bold text-brand-400 mt-1">{reconResult.ledgerSum}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Variance</div>
                <div
                  className={`text-base font-bold mt-1 ${
                    reconResult.difference === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {reconResult.difference}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsReconOpen(false)}>
                Close Audit Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
