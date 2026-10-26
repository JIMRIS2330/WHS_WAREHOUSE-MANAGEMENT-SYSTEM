import React from 'react';
import { Users, Plus, ShieldCheck, Mail, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';

export const UsersPage: React.FC = () => {
  const staff = [
    {
      id: 'USR-01',
      name: 'Sarah Connor',
      email: 'admin@warehouse.local',
      role: 'SUPER_ADMIN',
      facility: 'All Facilities',
      status: 'ACTIVE',
      lastLogin: 'Active Now'
    },
    {
      id: 'USR-02',
      name: 'Marcus Vance',
      email: 'manager@warehouse.local',
      role: 'WAREHOUSE_MANAGER',
      facility: 'Central DC (WH-01)',
      status: 'ACTIVE',
      lastLogin: '45 mins ago'
    },
    {
      id: 'USR-03',
      name: 'Elena Rostova',
      email: 'picker@warehouse.local',
      role: 'OUTBOUND_OPERATOR',
      facility: 'Central DC (WH-01)',
      status: 'ACTIVE',
      lastLogin: '10 mins ago'
    },
    {
      id: 'USR-04',
      name: 'Kenji Sato',
      email: 'inbound@warehouse.local',
      role: 'INBOUND_OPERATOR',
      facility: 'East Coast Hub (WH-02)',
      status: 'ACTIVE',
      lastLogin: '3 hours ago'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            Users & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Warehouse personnel directory, permission matrix and facility assignments
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Invite Staff Member
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Security Role</TableHead>
                <TableHead>Assigned Facility</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Last Terminal Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-semibold text-white text-xs">{u.name}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === 'SUPER_ADMIN'
                          ? 'purple'
                          : u.role === 'WAREHOUSE_MANAGER'
                          ? 'info'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">{u.facility}</TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm" dot>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">{u.lastLogin}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Edit Permissions
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
