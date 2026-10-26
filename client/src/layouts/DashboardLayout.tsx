import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Package,
  Truck,
  Building2,
  ArrowDownToLine,
  ShoppingCart,
  Send,
  BarChart3,
  Users,
  Settings,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Warehouse as WarehouseIcon,
  ShieldAlert,
  CheckCircle2,
  Activity,
  Layers,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info';
}

export const DashboardLayout: React.FC = () => {
  const {
    user,
    logout,
    warehouses,
    activeWarehouse,
    setActiveWarehouse,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    clearAllNotifications
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  // Poll backend health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setBackendHealthy(data.success);
        } else {
          setBackendHealthy(false);
        }
      } catch {
        setBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: 'Core Operations',
      items: [
        { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
        {
          label: 'Inventory',
          path: '/inventory',
          icon: <Boxes className="w-4 h-4" />,
          badge: '12 Low',
          badgeVariant: 'warning'
        },
        {
          label: 'Receiving (Inbound)',
          path: '/receiving',
          icon: <ArrowDownToLine className="w-4 h-4" />,
          badge: '8 Active',
          badgeVariant: 'info'
        },
        {
          label: 'Orders (Fulfillment)',
          path: '/orders',
          icon: <ShoppingCart className="w-4 h-4" />,
          badge: '34 Ready',
          badgeVariant: 'success'
        },
        { label: 'Dispatch & Shipping', path: '/dispatch', icon: <Send className="w-4 h-4" /> }
      ]
    },
    {
      group: 'Master Catalog',
      items: [
        { label: 'Products', path: '/products', icon: <Package className="w-4 h-4" /> },
        { label: 'Categories', path: '/categories', icon: <Tag className="w-4 h-4" /> },
        { label: 'Suppliers', path: '/suppliers', icon: <Truck className="w-4 h-4" /> },
        { label: 'Warehouses', path: '/warehouses', icon: <Building2 className="w-4 h-4" /> }
      ]
    },
    {
      group: 'Intelligence & Admin',
      items: [
        { label: 'Reports & Analytics', path: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Users & Roles', path: '/users', icon: <Users className="w-4 h-4" /> },
        { label: 'System Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                LOGIX <span className="text-brand-400 font-extrabold">WMS</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">Enterprise v1.0</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Facility Banner */}
        <div className="px-4 py-3 bg-slate-850/60 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WarehouseIcon className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[140px]">
                {activeWarehouse.name}
              </span>
            </div>
            <Badge variant="info" size="sm">
              {activeWarehouse.code}
            </Badge>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Capacity Utilization</span>
            <span className="font-semibold text-slate-200">{activeWarehouse.occupancyPercent}%</span>
          </div>
          <div className="mt-1 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                activeWarehouse.occupancyPercent > 85
                  ? 'bg-rose-500'
                  : activeWarehouse.occupancyPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${activeWarehouse.occupancyPercent}%` }}
            />
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm shadow-brand-900/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <Badge variant={item.badgeVariant || 'neutral'} size="sm">
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: System Status */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealthy === true
                  ? 'bg-emerald-400 animate-pulse'
                  : backendHealthy === false
                  ? 'bg-rose-400'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-[11px] text-slate-400">
              {backendHealthy === true ? 'Server Online' : 'Server Standby'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">API: 5000</span>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Warehouse Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setWarehouseDropdownOpen(!warehouseDropdownOpen);
                  setUserMenuOpen(false);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-colors"
              >
                <WarehouseIcon className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden sm:inline">{activeWarehouse.name}</span>
                <span className="sm:hidden">{activeWarehouse.code}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {warehouseDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-xl shadow-black/60 p-2 z-30">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Select Facility
                  </div>
                  {warehouses.map(wh => (
                    <button
                      key={wh.id}
                      onClick={() => {
                        setActiveWarehouse(wh);
                        setWarehouseDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                        activeWarehouse.id === wh.id
                          ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{wh.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {wh.city} • {wh.totalAreaM2.toLocaleString()} m²
                        </div>
                      </div>
                      <Badge variant={wh.occupancyPercent > 80 ? 'warning' : 'neutral'} size="sm">
                        {wh.occupancyPercent}%
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Search */}
            <div className="hidden md:flex items-center relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search SKU, Order, Bin, PO... (Ctrl+K)"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-8 pr-12 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
              />
              <span className="absolute right-2.5 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-3">
            {/* Live Backend Connection Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-slate-400">Gateway:</span>
              <span className="font-medium text-emerald-400">Active</span>
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setUserMenuOpen(false);
                  setWarehouseDropdownOpen(false);
                }}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 p-3 z-30">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Notifications
                      {unreadNotificationCount > 0 && (
                        <Badge variant="danger" size="sm">
                          {unreadNotificationCount} New
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No notifications to display
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            n.read
                              ? 'bg-slate-950/40 text-slate-400'
                              : 'bg-slate-800/70 text-slate-200 border-l-2 border-brand-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{n.title}</span>
                            <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed opacity-90">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotificationsOpen(false);
                  setWarehouseDropdownOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <img
                  src={
                    user?.avatarUrl ||
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
                  }
                  alt={user?.name || 'User'}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {user?.name || 'Sarah Connor'}
                  </div>
                  <div className="text-[10px] text-brand-400 font-mono">
                    {user?.role?.replace('_', ' ') || 'SUPER ADMIN'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-xl shadow-black/80 p-2 z-30">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-xs font-semibold text-white">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Account Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
