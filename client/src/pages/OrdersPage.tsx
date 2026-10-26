import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  XCircle,
  Eye,
  RefreshCw,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import {
  getOrders,
  getOrderById,
  createOrder,
  confirmAndAllocateOrder,
  cancelOrder,
  getCustomers,
  createCustomer,
  CustomerOrder,
  Customer,
  OrderStatus
} from '../api/fulfillment';
import { getProducts, getWarehouses } from '../api/masterData';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);

  // Form State: Create Order
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    warehouseId: '',
    shippingAddress: '',
    shippingCity: '',
    shippingCountry: 'USA',
    notes: '',
    lineItems: [
      {
        productId: '',
        quantityOrdered: 1,
        unitPrice: 0
      }
    ]
  });

  // Form State: Create Customer
  const [customerForm, setCustomerForm] = useState({
    code: '',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'USA'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersRes, custRes, prodRes, whRes] = await Promise.all([
        getOrders({ status: statusFilter !== 'ALL' ? statusFilter : undefined }),
        getCustomers({ isActive: true }),
        getProducts({ limit: 100, isActive: true }),
        getWarehouses()
      ]);

      setOrders(ordersRes.data || []);
      setCustomers(custRes.data || []);
      setProducts(prodRes.items || []);
      setWarehouses(whRes || []);

      if (custRes.data?.length > 0 && !orderForm.customerId) {
        setOrderForm(prev => ({ ...prev, customerId: custRes.data[0].id }));
      }
      if (whRes?.length > 0 && !orderForm.warehouseId) {
        setOrderForm(prev => ({ ...prev, warehouseId: whRes[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load orders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Handle Order Allocation
  const handleAllocateOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await confirmAndAllocateOrder(orderId);
      setSuccessMsg(`Order ${res.data.orderNumber} successfully allocated! Inventory reserved and pick tasks created.`);
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        const refreshed = await getOrderById(orderId);
        setSelectedOrder(refreshed.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to allocate order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Order Cancellation
  const handleCancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this order? Any reserved inventory will be released back to the available pool.'
    );
    if (!confirmCancel) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await cancelOrder(orderId, 'Cancelled from Order Management');
      setSuccessMsg(`Order ${res.data.orderNumber} cancelled. Reserved stock released.`);
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        const refreshed = await getOrderById(orderId);
        setSelectedOrder(refreshed.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Order Submit
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);

      // Validate lines
      const validLines = orderForm.lineItems.filter(l => l.productId && l.quantityOrdered > 0);
      if (validLines.length === 0) {
        throw new Error('Please select at least one valid product and quantity');
      }

      await createOrder({
        customerId: orderForm.customerId,
        warehouseId: orderForm.warehouseId,
        shippingAddress: orderForm.shippingAddress,
        shippingCity: orderForm.shippingCity,
        shippingCountry: orderForm.shippingCountry,
        notes: orderForm.notes,
        lineItems: validLines.map(l => ({
          productId: l.productId,
          quantityOrdered: Number(l.quantityOrdered),
          unitPrice: Number(l.unitPrice)
        }))
      });

      setSuccessMsg('Customer order created successfully in DRAFT status');
      setShowCreateModal(false);
      // Reset form
      setOrderForm({
        customerId: customers[0]?.id || '',
        warehouseId: warehouses[0]?.id || '',
        shippingAddress: '',
        shippingCity: '',
        shippingCountry: 'USA',
        notes: '',
        lineItems: [{ productId: products[0]?.id || '', quantityOrdered: 1, unitPrice: products[0]?.sellingPrice || 10 }]
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create sales order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Customer Submit
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);

      const res = await createCustomer(customerForm);
      setSuccessMsg(`Customer '${res.data.name}' registered successfully!`);
      setShowCustomerModal(false);
      setCustomerForm({
        code: '',
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'USA'
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setActionLoading(false);
    }
  };

  const addLineItem = () => {
    const defaultProd = products[0];
    setOrderForm(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          productId: defaultProd?.id || '',
          quantityOrdered: 1,
          unitPrice: defaultProd?.sellingPrice || 10
        }
      ]
    }));
  };

  const removeLineItem = (index: number) => {
    if (orderForm.lineItems.length <= 1) return;
    setOrderForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setOrderForm(prev => {
      const updated = [...prev.lineItems];
      const current = { ...updated[index], [field]: value };
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          current.unitPrice = prod.sellingPrice || prod.costPrice * 1.3 || 15;
        }
      }
      updated[index] = current;
      return { ...prev, lineItems: updated };
    });
  };

  const calculateTotalOrderAmount = () => {
    return orderForm.lineItems.reduce((sum, item) => {
      return sum + (Number(item.quantityOrdered) || 0) * (Number(item.unitPrice) || 0);
    }, 0);
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      !searchTerm ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Metrics
  const totalOrdersCount = orders.length;
  const draftCount = orders.filter(o => o.status === 'DRAFT').length;
  const inProgressCount = orders.filter(o =>
    ['CONFIRMED', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKED'].includes(o.status)
  ).length;
  const dispatchedCount = orders.filter(o => o.status === 'DISPATCHED').length;

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral" size="sm">Draft</Badge>;
      case 'CONFIRMED':
        return <Badge variant="info" size="sm">Confirmed</Badge>;
      case 'ALLOCATED':
        return <Badge variant="info" size="sm">Allocated</Badge>;
      case 'PICKING':
        return <Badge variant="warning" size="sm">Picking</Badge>;
      case 'PICKED':
        return <Badge variant="purple" size="sm">Picked</Badge>;
      case 'PACKED':
        return <Badge variant="purple" size="sm">Packed</Badge>;
      case 'DISPATCHED':
        return <Badge variant="success" size="sm">Dispatched</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" size="sm">Cancelled</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-400" />
            Outbound Sales Orders & Allocation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Customer order management, automated stock reservation, location-based pick waves, and shipping allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomerModal(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Customer
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Sales Order
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold text-white mt-1">{totalOrdersCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Active in fulfillment system</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Awaiting Allocation</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{draftCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Draft status needing reservation</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Fulfillment Waves</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1">{inProgressCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Allocated, picking, or packing</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Dispatched & Shipped</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{dispatchedCount}</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Completed outbound shipments</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full">
            <div className="w-full sm:w-80">
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by order # or customer..."
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="PICKING">Picking</option>
                <option value="PICKED">Picked</option>
                <option value="PACKED">Packed</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Lines / Qty</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading customer sales orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                    No customer sales orders found matching current criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => {
                  const totalUnits = order.lineItems.reduce((sum, l) => sum + l.quantityOrdered, 0);
                  const isAllocatable = order.status === 'DRAFT' || order.status === 'CONFIRMED';
                  const isCancellable = order.status !== 'DISPATCHED' && order.status !== 'CANCELLED';

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-bold text-brand-400">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-white">
                          {order.customer?.name || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {order.customer?.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {order.warehouse?.name || order.warehouseId}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        <span className="font-medium text-white">{order.lineItems.length} lines</span>
                        <span className="text-slate-500 ml-1">({totalUnits} units)</span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-400 font-mono">
                        ${Number(order.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailModal(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>

                          {isAllocatable && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-7 px-2 text-xs bg-brand-600 hover:bg-brand-500"
                              disabled={actionLoading}
                              onClick={() => handleAllocateOrder(order.id)}
                            >
                              Reserve
                            </Button>
                          )}

                          {isCancellable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              disabled={actionLoading}
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <XCircle className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* MODAL: CREATE SALES ORDER                                                 */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-brand-400" />
                  Create Customer Sales Order
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter line items and customer destination to generate a sales order
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Customer *
                  </label>
                  <select
                    value={orderForm.customerId}
                    onChange={e => setOrderForm(prev => ({ ...prev, customerId: e.target.value }))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Fulfillment Warehouse *
                  </label>
                  <select
                    value={orderForm.warehouseId}
                    onChange={e => setOrderForm(prev => ({ ...prev, warehouseId: e.target.value }))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Shipping Street Address
                  </label>
                  <input
                    type="text"
                    value={orderForm.shippingAddress}
                    onChange={e => setOrderForm(prev => ({ ...prev, shippingAddress: e.target.value }))}
                    placeholder="e.g. 742 Evergreen Terrace"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Shipping City
                  </label>
                  <input
                    type="text"
                    value={orderForm.shippingCity}
                    onChange={e => setOrderForm(prev => ({ ...prev, shippingCity: e.target.value }))}
                    placeholder="e.g. Springfield"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Order Line Items */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-200">
                    Order Line Items ({orderForm.lineItems.length})
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addLineItem}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Product
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {orderForm.lineItems.map((item, idx) => {
                    const rowTotal = (Number(item.quantityOrdered) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-800/60 border border-slate-700/60"
                      >
                        <div className="col-span-5">
                          <select
                            value={item.productId}
                            onChange={e => updateLineItem(idx, 'productId', e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-md p-1.5 outline-none focus:border-brand-500"
                          >
                            <option value="">Select SKU...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.sku} - {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantityOrdered}
                            onChange={e => updateLineItem(idx, 'quantityOrdered', e.target.value)}
                            required
                            placeholder="Qty"
                            className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-md p-1.5 outline-none focus:border-brand-500 text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)}
                            required
                            placeholder="Price"
                            className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-md p-1.5 outline-none focus:border-brand-500 text-right font-mono"
                          />
                        </div>
                        <div className="col-span-2 text-right text-xs font-mono font-semibold text-emerald-400">
                          ${rowTotal.toFixed(2)}
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            disabled={orderForm.lineItems.length <= 1}
                            className="text-slate-500 hover:text-rose-400 text-sm disabled:opacity-30"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-3 p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-300 font-medium">Estimated Order Total:</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    ${calculateTotalOrderAmount().toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Order Notes / Instructions
                </label>
                <textarea
                  value={orderForm.notes}
                  onChange={e => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Priority customer delivery, fragile handling required"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Creating...' : 'Create Sales Order'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE CUSTOMER                                                    */}
      {/* ========================================================================= */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-brand-400" />
                  Add Customer Account
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register a new client account for order allocation and shipping
                </p>
              </div>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Customer Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.code}
                    onChange={e => setCustomerForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. CUST-NEXUS"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 uppercase font-mono outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={e => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Nexus Electronics Inc"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={customerForm.contactName}
                    onChange={e => setCustomerForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="e.g. Alice Chen"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={e => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="alice@nexus.com"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={customerForm.address}
                    onChange={e => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="100 Silicon Way"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={e => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="San Jose"
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomerModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Register Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ORDER DETAILS & FULFILLMENT BREAKDOWN                              */}
      {/* ========================================================================= */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-white font-mono">
                    {selectedOrder.orderNumber}
                  </h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed on {new Date(selectedOrder.orderDate).toLocaleDateString()} for{' '}
                  <span className="text-white font-semibold">{selectedOrder.customer?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Order Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-800/40 border border-slate-700/60">
                <div>
                  <span className="text-[11px] text-slate-400">Customer Code</span>
                  <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                    {selectedOrder.customer?.code}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Warehouse Facility</span>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">
                    {selectedOrder.warehouse?.name || selectedOrder.warehouseId}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Shipping Destination</span>
                  <p className="text-xs text-slate-200 mt-0.5 truncate">
                    {selectedOrder.shippingCity || selectedOrder.shippingAddress || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Grand Total Value</span>
                  <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                    ${Number(selectedOrder.totalAmount).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Line Items Progress */}
              <div>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-brand-400" />
                  Line Items Fulfillment Matrix
                </h4>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU / Product</TableHead>
                        <TableHead className="text-center">Ordered</TableHead>
                        <TableHead className="text-center">Reserved</TableHead>
                        <TableHead className="text-center">Picked</TableHead>
                        <TableHead className="text-center">Packed</TableHead>
                        <TableHead className="text-center">Dispatched</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.lineItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-brand-400 block">
                              {item.product?.sku}
                            </span>
                            <span className="text-xs text-slate-300">{item.product?.name}</span>
                          </TableCell>
                          <TableCell className="text-center font-bold text-white text-xs">
                            {item.quantityOrdered}
                          </TableCell>
                          <TableCell className="text-center font-mono text-cyan-400 text-xs">
                            {item.quantityReserved}
                          </TableCell>
                          <TableCell className="text-center font-mono text-amber-400 text-xs">
                            {item.quantityPicked}
                          </TableCell>
                          <TableCell className="text-center font-mono text-indigo-400 text-xs">
                            {item.quantityPacked}
                          </TableCell>
                          <TableCell className="text-center font-mono text-emerald-400 text-xs">
                            {item.quantityDispatched}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-300">
                            ${Number(item.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-emerald-400">
                            ${Number(item.totalPrice).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Location-Based Pick Tasks (if generated) */}
              {selectedOrder.pickTasks && selectedOrder.pickTasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Generated Pick Tasks ({selectedOrder.pickTasks.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedOrder.pickTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                              Seq #{task.pickSequence}
                            </span>
                            <span className="text-xs font-mono font-bold text-brand-400">
                              {task.location?.barcode || task.locationId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            {task.product?.sku} - {task.product?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-white">
                            {task.quantityPicked} / {task.quantityToPick} units
                          </span>
                          <div className="mt-0.5">
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipments Ledger (if dispatched) */}
              {selectedOrder.shipments && selectedOrder.shipments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    Outbound Shipments & Tracking
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.shipments.map(shp => (
                      <div
                        key={shp.id}
                        className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {shp.dispatchNumber}
                          </span>
                          <p className="text-xs text-white font-medium mt-0.5">
                            Carrier: {shp.carrierName} ({shp.shippingMethod || 'Standard'})
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            Tracking: {shp.trackingNumber || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400">
                            {new Date(shp.dispatchedAt).toLocaleString()}
                          </span>
                          <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                            Stock Deducted ✓
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {(selectedOrder.status === 'DRAFT' || selectedOrder.status === 'CONFIRMED') && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleAllocateOrder(selectedOrder.id)}
                    >
                      Allocate & Reserve Stock
                    </Button>
                  )}
                  {selectedOrder.status !== 'DISPATCHED' && selectedOrder.status !== 'CANCELLED' && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                >
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
export default OrdersPage;
