import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ShieldCheck,
  Boxes,
  Truck,
  ArrowDownToLine,
  ShoppingCart,
  Send,
  AlertTriangle,
  Building2,
  Package,
  Eye,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import {
  getReport,
  downloadReportCsv,
  getAuditLogs,
  getReconciliation,
  ReportType,
  AuditLogItem
} from '../api/analytics';
import { getWarehouses, getProducts } from '../api/masterData';

type ActiveView = ReportType | 'audit-logs';

export const ReportsPage: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('inventory');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Master Data Filters
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Report Data
  const [reportData, setReportData] = useState<{
    items: any[];
    summary: Record<string, any>;
    total: number;
    totalPages: number;
    title: string;
  } | null>(null);

  // Audit Logs Data
  const [auditLogs, setAuditLogs] = useState<{
    items: AuditLogItem[];
    total: number;
    totalPages: number;
  }>({ items: [], total: 0, totalPages: 1 });

  // Reconciliation Audit State
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // Load Master Filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [whRes, prodRes] = await Promise.all([
          getWarehouses(),
          getProducts({ limit: 100, isActive: true })
        ]);
        setWarehouses(whRes || []);
        setProducts(prodRes.items || []);
      } catch (err: any) {
        console.error('Failed to load filter lookups:', err);
      }
    };
    loadFilters();
  }, []);

  // Fetch Report / Audit Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeView === 'audit-logs') {
        const res = await getAuditLogs({
          search: searchTerm || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit
        });
        setAuditLogs({
          items: res.data || [],
          total: res.total,
          totalPages: res.totalPages
        });
      } else {
        const res = await getReport(activeView, {
          search: searchTerm || undefined,
          warehouseId: warehouseId || undefined,
          productId: productId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit
        });
        setReportData({
          items: res.data || [],
          summary: res.summary || {},
          total: res.total,
          totalPages: res.totalPages,
          title: res.title
        });
      }

      // Check Reconciliation
      const recon = await getReconciliation(warehouseId || undefined);
      setReconciliation(recon.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeView, warehouseId, productId, page, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleCsvDownload = async () => {
    if (activeView === 'audit-logs') {
      alert('CSV export is currently available for operational reports.');
      return;
    }
    try {
      await downloadReportCsv(activeView, {
        search: searchTerm || undefined,
        warehouseId: warehouseId || undefined,
        productId: productId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reportTabs: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'inventory', label: 'Current Inventory', icon: <Boxes className="w-3.5 h-3.5" /> },
    { id: 'stock-movements', label: 'Stock Movements', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'locations', label: 'Storage Locations', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'receiving', label: 'Goods Receiving', icon: <ArrowDownToLine className="w-3.5 h-3.5" /> },
    { id: 'orders', label: 'Customer Orders', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { id: 'dispatch', label: 'Outbound Dispatch', icon: <Send className="w-3.5 h-3.5" /> },
    { id: 'low-stock', label: 'Low-Stock Alerts', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'valuation', label: 'Inventory Valuation', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'audit-logs', label: 'Audit Trail Logs', icon: <ShieldCheck className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Page Header (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-400" />
            Operational Intelligence & Financial Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time balance reporting, inventory valuation, stock movement ledgers, and immutable security audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {reconciliation && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Ledger Reconciled: ✓ Verified ({reconciliation.totalPhysicalOnHand} units)</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print
          </Button>

          {activeView !== 'audit-logs' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleCsvDownload}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (Hidden on print) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 print:hidden scrollbar-thin">
        {reportTabs.map(tab => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveView(tab.id);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar (Hidden on print) */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-1">
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search report..."
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            {/* Warehouse Filter */}
            {activeView !== 'audit-logs' && (
              <div>
                <select
                  value={warehouseId}
                  onChange={e => {
                    setWarehouseId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product Filter */}
            {['inventory', 'stock-movements', 'low-stock'].includes(activeView) && (
              <div>
                <select
                  value={productId}
                  onChange={e => {
                    setProductId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                >
                  <option value="">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filters */}
            {['stock-movements', 'receiving', 'orders', 'dispatch', 'audit-logs'].includes(activeView) && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2 outline-none focus:border-brand-500"
                  title="Start Date"
                />
                <span className="text-slate-500 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2 outline-none focus:border-brand-500"
                  title="End Date"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="sm" className="h-9 px-4 text-xs">
                Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={() => {
                  setSearchTerm('');
                  setWarehouseId('');
                  setProductId('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                  fetchData();
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Notice */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Summary KPI Cards (For Operational Reports) */}
      {activeView !== 'audit-logs' && reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          {Object.entries(reportData.summary).map(([key, val]) => (
            <Card key={key} className="p-3 bg-slate-900/60 border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <h4 className="text-lg font-bold text-white mt-0.5">
                {typeof val === 'number' && key.toLowerCase().includes('valuation')
                  ? `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : typeof val === 'number' && key.toLowerCase().includes('percent')
                  ? `${val}%`
                  : typeof val === 'number'
                  ? Number(val).toLocaleString()
                  : val}
              </h4>
            </Card>
          ))}
        </div>
      )}

      {/* Printable Report Header */}
      <div className="hidden print:block mb-6 border-b border-black pb-4">
        <h2 className="text-xl font-bold text-black uppercase tracking-wider">
          Warehouse Management System — Operational Report
        </h2>
        <p className="text-xs text-gray-700 mt-1">
          Report: <span className="font-bold">{activeView.toUpperCase()}</span> • Generated:{' '}
          {new Date().toLocaleString()}
        </p>
      </div>

      {/* ======================================================================= */}
      {/* 1. REPORT TABLE: CURRENT INVENTORY                                      */}
      {/* ======================================================================= */}
      {activeView === 'inventory' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Storage Bin</TableHead>
                  <TableHead className="text-center">On-Hand</TableHead>
                  <TableHead className="text-center">Reserved</TableHead>
                  <TableHead className="text-center">Available ATP</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Valuation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-xs text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading inventory balances...
                    </TableCell>
                  </TableRow>
                ) : reportData?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-xs text-slate-500">
                      No inventory balances found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.items.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs font-bold text-brand-400">
                        {i.sku}
                      </TableCell>
                      <TableCell className="text-xs text-white font-medium">
                        {i.productName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{i.categoryName}</TableCell>
                      <TableCell className="text-xs text-slate-300">{i.warehouseName}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {i.locationBarcode}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-white">
                        {i.quantityOnHand}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-cyan-400">
                        {i.quantityReserved}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs text-emerald-400">
                        {i.quantityAvailable}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-300">
                        ${Number(i.unitCost).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-emerald-400">
                        ${Number(i.totalValuation).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 2. REPORT TABLE: STOCK MOVEMENTS                                        */}
      {/* ======================================================================= */}
      {activeView === 'stock-movements' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Product SKU</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>From Location</TableHead>
                  <TableHead>To Location</TableHead>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading movement history...
                    </TableCell>
                  </TableRow>
                ) : reportData?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-500">
                      No stock movements recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.items.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-brand-400 block">
                          {m.sku}
                        </span>
                        <span className="text-[11px] text-slate-400">{m.productName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.movementType === 'STOCK_IN'
                              ? 'success'
                              : m.movementType === 'STOCK_OUT'
                              ? 'info'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {m.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs text-white">
                        {m.quantity}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {m.fromLocation}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {m.toLocation}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-300">
                        {m.referenceId}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{m.user}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 3. REPORT TABLE: WAREHOUSE LOCATIONS                                     */}
      {/* ======================================================================= */}
      {activeView === 'locations' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Storage Barcode</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Aisle / Rack / Shelf / Bin</TableHead>
                  <TableHead className="text-center">Stored SKUs</TableHead>
                  <TableHead className="text-center">On-Hand Units</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.items.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs font-bold text-brand-400">
                      {l.barcode}
                    </TableCell>
                    <TableCell className="text-xs text-white">{l.warehouseName}</TableCell>
                    <TableCell className="text-xs text-slate-300">{l.zone}</TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      A{l.aisle} • R{l.rack} • S{l.shelf} • B{l.bin}
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-white">
                      {l.storedProductCount}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-xs text-emerald-400">
                      {l.totalQuantityOnHand}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.status === 'OCCUPIED'
                            ? 'success'
                            : l.status === 'LOCKED'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {l.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 4. REPORT TABLE: GOODS RECEIVING (GRN)                                  */}
      {/* ======================================================================= */}
      {activeView === 'receiving' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Purchase Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Carrier & Tracking</TableHead>
                  <TableHead className="text-center">Received</TableHead>
                  <TableHead className="text-center">Accepted</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                  <TableHead>Received At</TableHead>
                  <TableHead>Received By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.items.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-bold text-brand-400">
                      {r.receiptNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{r.poNumber}</TableCell>
                    <TableCell className="text-xs text-white font-medium">{r.supplierName}</TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {r.carrierName} ({r.trackingNumber})
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-white font-mono">
                      {r.totalReceived}
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-emerald-400 font-mono">
                      {r.totalAccepted}
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-rose-400 font-mono">
                      {r.totalRejected}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.receivedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{r.receivedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 5. REPORT TABLE: CUSTOMER SALES ORDERS                                  */}
      {/* ======================================================================= */}
      {activeView === 'orders' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead className="text-center">Lines / Qty</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.items.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs font-bold text-brand-400">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-white block">{o.customerName}</span>
                      <span className="font-mono text-[10px] text-slate-400">{o.customerCode}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{o.warehouseName}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(o.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-slate-200">
                      {o.totalLines} lines ({o.totalUnitsOrdered} units)
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-emerald-400">
                      ${Number(o.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          o.status === 'DISPATCHED'
                            ? 'success'
                            : o.status === 'ALLOCATED' || o.status === 'PICKED'
                            ? 'info'
                            : o.status === 'CANCELLED'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {o.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 6. REPORT TABLE: OUTBOUND DISPATCH & SHIPMENTS                          */}
      {/* ======================================================================= */}
      {activeView === 'dispatch' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispatch #</TableHead>
                  <TableHead>Sales Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Carrier & Service</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Dispatched At</TableHead>
                  <TableHead>Dispatched By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.items.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs font-bold text-emerald-400">
                      {d.dispatchNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-brand-400">{d.orderNumber}</TableCell>
                    <TableCell className="text-xs text-white font-medium">{d.customerName}</TableCell>
                    <TableCell className="text-xs text-slate-300">
                      {d.carrierName} ({d.shippingMethod})
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-400">{d.trackingNumber}</TableCell>
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(d.dispatchedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{d.dispatchedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 7. REPORT TABLE: LOW-STOCK ALERTS                                       */}
      {/* ======================================================================= */}
      {activeView === 'low-stock' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-center">On-Hand</TableHead>
                  <TableHead className="text-center">Reorder Point</TableHead>
                  <TableHead className="text-center">Shortfall Units</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Est. Replenish Budget</TableHead>
                  <TableHead>Suggested Supplier</TableHead>
                  <TableHead>Urgency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.items.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs font-bold text-brand-400">
                      {l.sku}
                    </TableCell>
                    <TableCell className="text-xs text-white font-medium">{l.productName}</TableCell>
                    <TableCell className="text-center font-bold text-xs font-mono text-white">
                      {l.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-slate-400">
                      {l.reorderPoint}
                    </TableCell>
                    <TableCell className="text-center font-bold font-mono text-xs text-rose-400">
                      {l.shortfallQuantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-300">
                      ${Number(l.unitCost).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-amber-400">
                      ${Number(l.estimatedReplenishCost).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{l.suggestedSupplier}</TableCell>
                    <TableCell>
                      <Badge
                        variant={l.urgency === 'CRITICAL_STOCKOUT' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {l.urgency === 'CRITICAL_STOCKOUT' ? 'Stockout (0 units)' : 'Below Safety Stock'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 8. REPORT TABLE: INVENTORY VALUATION                                    */}
      {/* ======================================================================= */}
      {activeView === 'valuation' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">On-Hand Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Valuation Total</TableHead>
                  <TableHead className="text-right">Asset Share</TableHead>
                  <TableHead>Costing Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.items.map((v, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs font-bold text-brand-400">
                      {v.sku}
                    </TableCell>
                    <TableCell className="text-xs text-white font-medium">{v.productName}</TableCell>
                    <TableCell className="text-xs text-slate-300">{v.categoryName}</TableCell>
                    <TableCell className="text-center font-bold text-xs font-mono text-white">
                      {v.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-300">
                      ${Number(v.unitCost).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-emerald-400">
                      ${Number(v.totalValuation).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-cyan-400">
                      {v.assetSharePercent}%
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{v.costingMethod}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ======================================================================= */}
      {/* 9. REPORT TABLE: IMMUTABLE AUDIT TRAIL LOGS                             */}
      {/* ======================================================================= */}
      {activeView === 'audit-logs' && (
        <Card className="print:border-none print:shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User / Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Entity</TableHead>
                  <TableHead>Details / Changes</TableHead>
                  <TableHead className="text-right">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading security audit trail...
                    </TableCell>
                  </TableRow>
                ) : auditLogs.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      No audit events found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.items.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-white block">
                          {log.user?.name || 'System Operator'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.user?.role || 'SYSTEM'} ({log.user?.email || 'N/A'})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action.includes('DISPATCH') || log.action.includes('SUCCESS')
                              ? 'success'
                              : log.action.includes('CANCEL') || log.action.includes('DELETE')
                              ? 'danger'
                              : log.action.includes('ADJUST')
                              ? 'warning'
                              : 'info'
                          }
                          size="sm"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {log.entity} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300 max-w-sm truncate">
                        {log.details || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-brand-400 hover:text-brand-300"
                          onClick={() => setSelectedAuditLog(log)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
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

      {/* Pagination Controls (Hidden on print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-slate-800 print:hidden text-xs text-slate-400">
        <div>
          Showing page <span className="font-bold text-white">{page}</span> of{' '}
          <span className="font-bold text-white">
            {activeView === 'audit-logs' ? auditLogs.totalPages : reportData?.totalPages || 1}
          </span>{' '}
          (
          <span className="font-mono font-semibold text-slate-200">
            {activeView === 'audit-logs' ? auditLogs.total : reportData?.total || 0} total records
          </span>
          )
        </div>

        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={e => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

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
            disabled={
              page >=
              (activeView === 'audit-logs' ? auditLogs.totalPages : reportData?.totalPages || 1)
            }
            onClick={() => setPage(prev => prev + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* AUDIT LOG INSPECTION MODAL                                              */}
      {/* ======================================================================= */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Audit Event Record Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{selectedAuditLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <div>
                  <span className="text-slate-400 block text-[11px]">Action</span>
                  <span className="font-bold text-white text-xs">{selectedAuditLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Target Entity</span>
                  <span className="font-mono text-brand-400 text-xs">
                    {selectedAuditLog.entity} ({selectedAuditLog.entityId || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Responsible User</span>
                  <span className="text-white text-xs">
                    {selectedAuditLog.user?.name || 'System Operator'}
                  </span>
                  <span className="text-slate-400 text-[10px] block">
                    {selectedAuditLog.user?.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Timestamp</span>
                  <span className="text-slate-200 text-xs font-mono">
                    {new Date(selectedAuditLog.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block text-[11px] mb-1">Human-Readable Summary</label>
                <div className="p-3 bg-slate-800 rounded-lg text-slate-200 font-mono text-xs">
                  {selectedAuditLog.details || 'No additional details provided'}
                </div>
              </div>

              {selectedAuditLog.before && selectedAuditLog.after && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">Before State</label>
                    <pre className="p-2.5 bg-slate-800/80 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(selectedAuditLog.before, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">After State</label>
                    <pre className="p-2.5 bg-slate-800/80 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(selectedAuditLog.after, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setSelectedAuditLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReportsPage;
