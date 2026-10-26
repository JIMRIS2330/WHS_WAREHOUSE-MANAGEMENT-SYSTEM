import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  QrCode,
  Package,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Barcode,
  Layers,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import {
  getShipments,
  getPickTasks,
  confirmPickTask,
  confirmPacking,
  confirmDispatch,
  getOrders,
  Shipment,
  PickTask,
  CustomerOrder
} from '../api/fulfillment';

type ActiveTab = 'SHIPMENTS' | 'PICKING' | 'PACKING' | 'DISPATCH';

export const DispatchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('SHIPMENTS');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pickTasks, setPickTasks] = useState<PickTask[]>([]);
  const [pickedOrders, setPickedOrders] = useState<CustomerOrder[]>([]);
  const [packedOrders, setPackedOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedPickTask, setSelectedPickTask] = useState<PickTask | null>(null);
  const [pickQtyInput, setPickQtyInput] = useState<number>(1);
  const [pickNotesInput, setPickNotesInput] = useState('');

  const [selectedPackOrder, setSelectedPackOrder] = useState<CustomerOrder | null>(null);
  const [packNotesInput, setPackNotesInput] = useState('');

  const [selectedDispatchOrder, setSelectedDispatchOrder] = useState<CustomerOrder | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    carrierName: 'DHL Global Express',
    trackingNumber: '',
    shippingMethod: 'Express Air Freight',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [shipmentsRes, tasksRes, ordersRes] = await Promise.all([
        getShipments({ limit: 50 }),
        getPickTasks(),
        getOrders()
      ]);

      setShipments(shipmentsRes.data || []);
      setPickTasks(tasksRes.data || []);

      const allOrders = ordersRes.data || [];
      setPickedOrders(allOrders.filter(o => o.status === 'PICKED'));
      setPackedOrders(allOrders.filter(o => o.status === 'PACKED'));
    } catch (err: any) {
      setError(err.message || 'Failed to load fulfillment workstation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Pick Task Confirmation
  const handleConfirmPick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPickTask) return;

    try {
      setActionLoading(true);
      setError(null);

      await confirmPickTask(
        selectedPickTask.id,
        Number(pickQtyInput),
        pickNotesInput || undefined
      );

      setSuccessMsg(
        `Pick task confirmed: ${pickQtyInput} units picked at location ${selectedPickTask.location?.barcode || selectedPickTask.locationId}`
      );
      setSelectedPickTask(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm pick task');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Packing Confirmation
  const handleConfirmPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackOrder) return;

    try {
      setActionLoading(true);
      setError(null);

      await confirmPacking(selectedPackOrder.id, packNotesInput || undefined);
      setSuccessMsg(`Order ${selectedPackOrder.orderNumber} successfully packed and staged for dispatch!`);
      setSelectedPackOrder(null);
      setPackNotesInput('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to pack order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dispatch Confirmation (Physical Stock Deduction)
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispatchOrder) return;

    try {
      setActionLoading(true);
      setError(null);

      const res = await confirmDispatch(selectedDispatchOrder.id, {
        carrierName: dispatchForm.carrierName,
        trackingNumber: dispatchForm.trackingNumber || undefined,
        shippingMethod: dispatchForm.shippingMethod,
        notes: dispatchForm.notes || undefined
      });

      setSuccessMsg(
        `Dispatched! Shipment ${res.data.shipment.dispatchNumber} issued. Physical on-hand stock deducted exactly once.`
      );
      setSelectedDispatchOrder(null);
      setDispatchForm({
        carrierName: 'DHL Global Express',
        trackingNumber: '',
        shippingMethod: 'Express Air Freight',
        notes: ''
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch order');
    } finally {
      setActionLoading(false);
    }
  };

  // KPI Calculations
  const pendingPicksCount = pickTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
  const readyToPackCount = pickedOrders.length;
  const readyToShipCount = packedOrders.length;
  const totalShipmentsCount = shipments.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Send className="w-6 h-6 text-brand-400" />
            Outbound Fulfillment & Dispatch Workstation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pick wave execution, packing quality control, carrier manifests, and atomic stock-out dispatch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white text-sm">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white text-sm">×</button>
        </div>
      )}

      {/* Workstation KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`p-4 cursor-pointer transition-all ${
            activeTab === 'PICKING'
              ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
          onClick={() => setActiveTab('PICKING')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Pick Queue</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{pendingPicksCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Active bin locations to pick</p>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-all ${
            activeTab === 'PACKING'
              ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
          onClick={() => setActiveTab('PACKING')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Packing Bench</p>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1">{readyToPackCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Picked orders awaiting carton packaging</p>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-all ${
            activeTab === 'DISPATCH'
              ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
          onClick={() => setActiveTab('DISPATCH')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Ready to Dispatch</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1">{readyToShipCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Packed cartons awaiting courier handoff</p>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-all ${
            activeTab === 'SHIPMENTS'
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
          onClick={() => setActiveTab('SHIPMENTS')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Completed Shipments</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{totalShipmentsCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Stock deducted & tracking manifest</p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('SHIPMENTS')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'SHIPMENTS'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Shipments & Manifests ({totalShipmentsCount})
        </button>

        <button
          onClick={() => setActiveTab('PICKING')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'PICKING'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Location Pick Tasks ({pickTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('PACKING')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'PACKING'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Packing Station ({readyToPackCount})
        </button>

        <button
          onClick={() => setActiveTab('DISPATCH')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'DISPATCH'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Dispatch Confirmation ({readyToShipCount})
        </button>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: SHIPMENTS & CARRIER MANIFESTS LEDGER                             */}
      {/* ======================================================================= */}
      {activeTab === 'SHIPMENTS' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispatch #</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Carrier Service</TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Shipping Method</TableHead>
                  <TableHead>Dispatched At</TableHead>
                  <TableHead className="text-right">Inventory Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading shipment ledger...
                    </TableCell>
                  </TableRow>
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      No outbound dispatches recorded yet. Complete an order through dispatch to record shipments.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-bold text-emerald-400">
                        {s.dispatchNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-brand-400">
                        {s.order?.orderNumber || s.orderId}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-white">
                        {s.carrierName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {s.trackingNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {s.shippingMethod || 'Standard'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {new Date(s.dispatchedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="success" size="sm">
                          STOCK_OUT Deducted
                        </Badge>
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
      {/* TAB 2: LOCATION-BASED PICK QUEUE                                       */}
      {/* ======================================================================= */}
      {activeTab === 'PICKING' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Walking Seq</TableHead>
                  <TableHead>Storage Bin Location</TableHead>
                  <TableHead>Product SKU & Name</TableHead>
                  <TableHead className="text-center">To Pick</TableHead>
                  <TableHead className="text-center">Picked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading location pick tasks...
                    </TableCell>
                  </TableRow>
                ) : pickTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      No active pick tasks. Confirm sales orders to generate wave pick tasks.
                    </TableCell>
                  </TableRow>
                ) : (
                  pickTasks.map(task => {
                    const isPending = task.status === 'PENDING' || task.status === 'IN_PROGRESS';
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                            #{task.pickSequence}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Barcode className="w-4 h-4 text-brand-400 shrink-0" />
                            <span className="font-mono text-xs font-bold text-white">
                              {task.location?.barcode || task.locationId}
                            </span>
                          </div>
                          {task.location && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Aisle {task.location.aisle} • Rack {task.location.rack} • Shelf {task.location.shelf} • Bin {task.location.bin}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-brand-400 block">
                            {task.product?.sku}
                          </span>
                          <span className="text-xs text-slate-300">{task.product?.name}</span>
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono text-white text-xs">
                          {task.quantityToPick}
                        </TableCell>
                        <TableCell className="text-center font-mono text-amber-400 text-xs font-bold">
                          {task.quantityPicked}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === 'PICKED'
                                ? 'success'
                                : task.status === 'SHORT_PICKED'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-500"
                              onClick={() => {
                                setSelectedPickTask(task);
                                setPickQtyInput(task.quantityToPick - task.quantityPicked);
                                setPickNotesInput('');
                              }}
                            >
                              Scan & Pick
                            </Button>
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium">Completed ✓</span>
                          )}
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

      {/* ======================================================================= */}
      {/* TAB 3: PACKING BENCH                                                    */}
      {/* ======================================================================= */}
      {activeTab === 'PACKING' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Picked Items Summary</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading packing station...
                    </TableCell>
                  </TableRow>
                ) : pickedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                      No orders currently waiting in PICKED status. Pick open orders to move them here.
                    </TableCell>
                  </TableRow>
                ) : (
                  pickedOrders.map(order => {
                    const totalUnits = order.lineItems.reduce((sum, l) => sum + l.quantityPicked, 0);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-bold text-brand-400">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-white">
                            {order.customer?.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {order.customer?.code}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <span className="font-semibold text-white">{order.lineItems.length} lines</span>
                          <span className="text-slate-400 ml-1">({totalUnits} units picked)</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {order.shippingCity || order.shippingAddress || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="purple" size="sm">
                            Ready to Pack
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-500"
                            onClick={() => {
                              setSelectedPackOrder(order);
                              setPackNotesInput('');
                            }}
                          >
                            <Package className="w-3.5 h-3.5 mr-1" />
                            Verify & Pack
                          </Button>
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

      {/* ======================================================================= */}
      {/* TAB 4: DISPATCH CONFIRMATION                                            */}
      {/* ======================================================================= */}
      {activeTab === 'DISPATCH' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Packed Units</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading dispatch staging queue...
                    </TableCell>
                  </TableRow>
                ) : packedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                      No packed orders awaiting courier dispatch.
                    </TableCell>
                  </TableRow>
                ) : (
                  packedOrders.map(order => {
                    const totalUnits = order.lineItems.reduce((sum, l) => sum + l.quantityPacked, 0);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-bold text-brand-400">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-white">
                            {order.customer?.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {order.customer?.code}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <span className="font-semibold text-white">{totalUnits} units</span>
                          <span className="text-slate-400 ml-1">packed & boxed</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {order.shippingCity || order.shippingAddress || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="info" size="sm">
                            Packed & Staged
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-500"
                            onClick={() => {
                              setSelectedDispatchOrder(order);
                              setDispatchForm({
                                carrierName: 'DHL Global Express',
                                trackingNumber: `TRK-${Date.now().toString().slice(-6)}`,
                                shippingMethod: 'Standard Ground',
                                notes: ''
                              });
                            }}
                          >
                            <Truck className="w-3.5 h-3.5 mr-1" />
                            Confirm Dispatch
                          </Button>
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

      {/* ======================================================================= */}
      {/* MODAL: CONFIRM PICK TASK                                                */}
      {/* ======================================================================= */}
      {selectedPickTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  Confirm Pick Task
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scan and confirm item retrieval from assigned storage bin
                </p>
              </div>
              <button
                onClick={() => setSelectedPickTask(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmPick} className="p-5 space-y-4">
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Target Storage Bin</span>
                  <span className="text-xs font-mono font-bold text-brand-400">
                    {selectedPickTask.location?.barcode || selectedPickTask.locationId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Product SKU</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {selectedPickTask.product?.sku}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Assigned Quantity</span>
                  <span className="text-xs font-bold text-amber-400">
                    {selectedPickTask.quantityToPick} units
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Quantity Picked *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPickTask.quantityToPick}
                  value={pickQtyInput}
                  onChange={e => setPickQtyInput(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-sm font-mono text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enter less than {selectedPickTask.quantityToPick} to record a short-pick. Over-picking is blocked.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pick Verification Notes
                </label>
                <input
                  type="text"
                  value={pickNotesInput}
                  onChange={e => setPickNotesInput(e.target.value)}
                  placeholder="e.g. Verified batch code, inspected packaging"
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPickTask(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  {actionLoading ? 'Confirming...' : 'Confirm Pick'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: CONFIRM PACKING                                                  */}
      {/* ======================================================================= */}
      {selectedPackOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  Packing Station Verification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm carton boxing and staging for order {selectedPackOrder.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedPackOrder(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmPack} className="p-5 space-y-4">
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Customer</span>
                  <span className="text-white font-semibold">{selectedPackOrder.customer?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Lines</span>
                  <span className="text-slate-200">{selectedPackOrder.lineItems.length} lines</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Units Picked</span>
                  <span className="text-indigo-400 font-bold font-mono">
                    {selectedPackOrder.lineItems.reduce((s, l) => s + l.quantityPicked, 0)} units
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Packing Carton / Seal Barcode / Notes
                </label>
                <textarea
                  value={packNotesInput}
                  onChange={e => setPackNotesInput(e.target.value)}
                  placeholder="e.g. Carton #BOX-9901 packed with bubble wrap and tamper tape"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPackOrder(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {actionLoading ? 'Staging...' : 'Complete Packing'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: CONFIRM DISPATCH (PHYSICAL STOCK DEDUCTION)                      */}
      {/* ======================================================================= */}
      {selectedDispatchOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  Dispatch & Shipping Confirmation
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm courier handover. Deducts on-hand physical stock exactly once.
                </p>
              </div>
              <button
                onClick={() => setSelectedDispatchOrder(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-5 space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
                <span className="font-bold block mb-1">⚡ Atomic Physical Stock Deduction:</span>
                Confirming dispatch will deduct on-hand inventory from storage bins and write immutable STOCK_OUT movement records.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Carrier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.carrierName}
                    onChange={e => setDispatchForm(prev => ({ ...prev, carrierName: e.target.value }))}
                    placeholder="e.g. DHL Express, FedEx, UPS"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={dispatchForm.trackingNumber}
                    onChange={e => setDispatchForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    placeholder="e.g. TRK-88291040"
                    className="w-full bg-slate-800 border border-slate-700 text-xs font-mono text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Shipping Method / Service
                </label>
                <input
                  type="text"
                  value={dispatchForm.shippingMethod}
                  onChange={e => setDispatchForm(prev => ({ ...prev, shippingMethod: e.target.value }))}
                  placeholder="e.g. Overnight Express, Standard Ground"
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dock / Manifest Notes
                </label>
                <input
                  type="text"
                  value={dispatchForm.notes}
                  onChange={e => setDispatchForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Dispatched from Dock Bay 4"
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDispatchOrder(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  {actionLoading ? 'Deducting & Dispatching...' : 'Confirm Dispatch & Deduct Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DispatchPage;
