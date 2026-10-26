import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Warehouse, NotificationItem } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  warehouses: Warehouse[];
  activeWarehouse: Warehouse;
  setActiveWarehouse: (wh: Warehouse) => void;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  login: (email: string, role?: string) => Promise<boolean>;
  logout: () => void;
}

const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-01',
    code: 'WH-01',
    name: 'Central Distribution Center',
    city: 'Chicago, IL',
    country: 'USA',
    totalAreaM2: 24500,
    occupancyPercent: 78
  },
  {
    id: 'wh-02',
    code: 'WH-02',
    name: 'East Coast Fulfillment Hub',
    city: 'Newark, NJ',
    country: 'USA',
    totalAreaM2: 18200,
    occupancyPercent: 64
  },
  {
    id: 'wh-03',
    code: 'WH-03',
    name: 'West Coast Logistics Center',
    city: 'Reno, NV',
    country: 'USA',
    totalAreaM2: 32000,
    occupancyPercent: 89
  }
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Low Stock Alert',
    message: 'SKU PAL-092 (Industrial Pallets) reached critical threshold (4 units remaining).',
    type: 'warning',
    timestamp: '10 min ago',
    read: false
  },
  {
    id: 'notif-2',
    title: 'Inbound PO #PO-8821 Arrived',
    message: 'Carrier FedEx Freight docked at Door 4. Ready for GRN inspection.',
    type: 'info',
    timestamp: '25 min ago',
    read: false
  },
  {
    id: 'notif-3',
    title: 'Batch Quarantined',
    message: 'Batch LOT-2026-X12 was placed under QC hold due to temperature spike.',
    type: 'alert',
    timestamp: '1 hour ago',
    read: false
  },
  {
    id: 'notif-4',
    title: 'Wave #401 Dispatched',
    message: 'All 48 orders in Outbound Wave #401 signed and dispatched.',
    type: 'success',
    timestamp: '3 hours ago',
    read: true
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wms_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default demo login session for seamless initial experience
    return {
      id: 'usr-admin-01',
      email: 'admin@warehouse.local',
      name: 'Sarah Connor',
      role: 'SUPER_ADMIN',
      assignedWarehouse: 'Central DC (WH-01)',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [warehouses] = useState<Warehouse[]>(DEFAULT_WAREHOUSES);
  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse>(DEFAULT_WAREHOUSES[0]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    if (user) {
      localStorage.setItem('wms_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('wms_auth_user');
    }
  }, [user]);

  const login = async (email: string, role: string = 'SUPER_ADMIN'): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Try hitting the backend API or use local demo fallback
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'demo-password' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.user) {
            if (data.data?.token) {
              localStorage.setItem('wms_auth_token', data.data.token);
            }
            setUser({
              ...data.data.user,
              avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
            });
            setIsLoading(false);
            return true;
          }
        }
      } catch {
        // Backend offline fallback
      }

      // Fallback local auth
      const name = email.split('@')[0].replace('.', ' ').toUpperCase();
      setUser({
        id: `usr-${Date.now()}`,
        email,
        name,
        role: (role as any) || 'WAREHOUSE_MANAGER',
        assignedWarehouse: activeWarehouse.name,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wms_auth_user');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        warehouses,
        activeWarehouse,
        setActiveWarehouse,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        clearAllNotifications,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
