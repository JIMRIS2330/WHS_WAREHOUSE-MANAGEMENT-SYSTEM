import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  PackageCheck,
  TrendingUp,
  AlertTriangle,
  ArrowDownToLine,
  ShoppingCart,
  Send,
  Building2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Truck,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  Layers,
  ArrowRight,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { getDashboardMetrics, DashboardMetrics } from '../api/analytics';
import { getWarehouses } from '../api/masterData';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (whId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const [metricsRes, whRes] = await Promise.all([
        getDashboardMetrics(whId || undefined),
        getWarehouses()
      ]);
      setMetrics(metricsRes.data);
      setWarehouses(whRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(selectedWarehouseId);
  }, [selectedWarehouseId]);

  const summary = metrics?.summary;
  const charts = metrics?.charts;

  // Max value calculation for movement trend bars
  const maxMovement = Math.max(
    1,
    ...(charts?.movementsTrend.map(d => Math.max(d.inbound, d.outbound, d.adjustments)) || [10])
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-400" />
            Warehouse Operations Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, automated inventory balances, fulfillment velocity, and live audit tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Facility Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <Building2 className="w-4 h-4 text-brand-400 shrink-0" />
            <select
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">
                All Facilities (Global)
              </option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-slate-200">
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics(selectedWarehouseId)}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchMetrics(selectedWarehouseId)}>
            Retry
          </Button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Products */}
        <Card
          className="p-3.5 bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer transition-all border-l-4 border-l-brand-500"
          onClick={() => navigate('/products')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Master SKUs</span>
            <Boxes className="w-4 h-4 text-brand-400" />
          </div>
          <h3 className="text-xl font-bold text-white mt-1">
            {loading ? '...' : summary?.totalProducts ?? 0}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            {summary?.activeProducts ?? 0} Active in catalog
          </p>
        </Card>

        {/* Metric 2: Total On-Hand */}
        <Card
          className="p-3.5 bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer transition-all border-l-4 border-l-emerald-500"
          onClick={() => navigate('/inventory')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Stock On Hand</span>
            <PackageCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mt-1">
            {loading ? '...' : `${summary?.totalStockOnHand ?? 0} units`}
          </h3>
          <p className="text-[10px] text-emerald-400 font-mono mt-1">
            ${Number(summary?.totalInventoryValuation ?? 0).toLocaleString()} Value
          </p>
        </Card>

        {/* Metric 3: Reserved vs Available ATP */}
        <Card
          className="p-3.5 bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer transition-all border-l-4 border-l-sky-500"
          onClick={() => navigate('/inventory')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Available ATP</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <h3 className="text-xl font-bold text-sky-400 mt-1">
            {loading ? '...' : `${summary?.totalStockAvailable ?? 0} units`}
          </h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            ({summary?.totalStockReserved ?? 0} Reserved)
          </p>
        </Card>

        {/* Metric 4: Inbound POs */}
        <Card
          className="p-3.5 bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer transition-all border-l-4 border-l-indigo-500"
          onClick={() => navigate('/receiving')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Inbound POs</span>
            <ArrowDownToLine className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white mt-1">
            {loading ? '...' : summary?.pendingPurchaseOrdersCount ?? 0}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            {metrics?.inboundStats.submittedPOs ?? 0} Submitted / Arriving
          </p>
        </Card>

        {/* Metric 5: Customer Orders */}
        <Card
          className="p-3.5 bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer transition-all border-l-4 border-l-purple-500"
          onClick={() => navigate('/orders')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Fulfillment Queue</span>
            <ShoppingCart className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-white mt-1">
            {loading ? '...' : summary?.pendingCustomerOrdersCount ?? 0}
          </h3>
          <p className="text-[10px] text-purple-400 mt-1">
            {metrics?.fulfillmentStats.allocatedOrders ?? 0} Allocated & Picking
          </p>
        </Card>

        {/* Metric 6: Low Stock / Stockouts */}
        <Card
          className="p-3.5 bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer transition-all border-l-4 border-l-amber-500"
          onClick={() => navigate('/reports')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-amber-400 mt-1">
            {loading ? '...' : (summary?.lowStockItemCount ?? 0) + (summary?.outOfStockItemCount ?? 0)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            {summary?.outOfStockItemCount ?? 0} Stockout • {summary?.lowStockItemCount ?? 0} Low
          </p>
        </Card>
      </div>

      {/* Main Analytical Section: Visual Telemetry & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Velocity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                7-Day Stock Movement Velocity
              </CardTitle>
              <CardDescription className="text-xs">
                Inbound receipts (Stock-In) vs Outbound fulfillment (Stock-Out) vs Stock Adjustments
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Inbound
              </span>
              <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Outbound
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Adjustments
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="space-y-4">
              {charts?.movementsTrend.map(d => {
                const dayLabel = new Date(d.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                });
                const inboundWidth = `${Math.min(100, Math.round((d.inbound / maxMovement) * 100))}%`;
                const outboundWidth = `${Math.min(100, Math.round((d.outbound / maxMovement) * 100))}%`;
                const adjustWidth = `${Math.min(100, Math.round((d.adjustments / maxMovement) * 100))}%`;

                return (
                  <div key={d.date} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium">{dayLabel}</span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        +{d.inbound} in / -{d.outbound} out / ±{d.adjustments} adj
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                      <div
                        style={{ width: inboundWidth }}
                        className="h-full bg-emerald-500 rounded-sm transition-all"
                        title={`Inbound: ${d.inbound}`}
                      />
                      <div
                        style={{ width: outboundWidth }}
                        className="h-full bg-sky-500 rounded-sm transition-all"
                        title={`Outbound: ${d.outbound}`}
                      />
                      <div
                        style={{ width: adjustWidth }}
                        className="h-full bg-amber-500 rounded-sm transition-all"
                        title={`Adjustments: ${d.adjustments}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Lifecycle Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-400" />
              Order Pipeline Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Live status counts across fulfillment pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            {charts?.orderStatusDistribution.map(item => {
              const totalOrders = metrics?.fulfillmentStats.totalOrders || 1;
              const percent = Math.round((item.count / totalOrders) * 100);

              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="font-mono text-white font-semibold">
                      {item.count} orders ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full transition-all ${
                        item.status === 'DISPATCHED'
                          ? 'bg-emerald-500'
                          : item.status === 'ALLOCATED' || item.status === 'PICKED' || item.status === 'PACKED'
                          ? 'bg-purple-500'
                          : item.status === 'CANCELLED'
                          ? 'bg-rose-500'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Facilities & Fast-Moving SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warehouse Distribution */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Facility Balances & Valuation
              </CardTitle>
              <CardDescription className="text-xs">
                Asset valuation and physical on-hand breakdown by warehouse
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate('/warehouses')}
            >
              Manage
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Stock On-Hand</TableHead>
                  <TableHead className="text-right">Valuation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charts?.warehouseDistribution.map(w => (
                  <TableRow key={w.warehouseId}>
                    <TableCell>
                      <span className="font-semibold text-xs text-white block">
                        {w.warehouseName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{w.warehouseCode}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">
                      {w.productCount} SKUs
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-white">
                      {w.totalOnHand} units
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-emerald-400">
                      ${Number(w.valuation).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Fast-Moving Dispatched Products */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                Top Outbound Moving Products
              </CardTitle>
              <CardDescription className="text-xs">
                Highest outbound velocity SKUs fulfilled through dispatch
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate('/dispatch')}
            >
              Shipments
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU / Name</TableHead>
                  <TableHead className="text-right">Dispatched Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charts?.topMovingProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-500">
                      No outbound movements recorded yet. Complete customer orders to populate velocity.
                    </TableCell>
                  </TableRow>
                ) : (
                  charts?.topMovingProducts.map(p => (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-brand-400 block">
                          {p.sku}
                        </span>
                        <span className="text-xs text-slate-300 truncate max-w-xs block">
                          {p.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-sky-400">
                        {p.totalDispatched} units
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-300">
                        ${Number(p.unitPrice || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Live Operational Audit Feed */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Live Security & Operations Audit Stream
            </CardTitle>
            <CardDescription className="text-xs">
              Immutable system activity audit events recorded across all warehouse operations
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => navigate('/reports')}
          >
            Full Audit Ledger
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User / Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Audit Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.recentActivity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                    No recent audit activity recorded.
                  </TableCell>
                </TableRow>
              ) : (
                metrics?.recentActivity.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()} •{' '}
                      {new Date(log.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-white block">
                        {log.user?.name || 'System Actor'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.user?.role || 'SYSTEM'}
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
                    <TableCell className="text-xs font-mono text-slate-300">
                      {log.entity}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 max-w-md truncate">
                      {log.details || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default DashboardPage;
