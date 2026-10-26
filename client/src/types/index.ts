export type UserRole =
  | 'SUPER_ADMIN'
  | 'WAREHOUSE_MANAGER'
  | 'INVENTORY_CONTROLLER'
  | 'INBOUND_OPERATOR'
  | 'OUTBOUND_OPERATOR'
  | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedWarehouse: string;
  avatarUrl?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  totalAreaM2: number;
  occupancyPercent: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  timestamp: string;
  read: boolean;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  iconName: string;
}
