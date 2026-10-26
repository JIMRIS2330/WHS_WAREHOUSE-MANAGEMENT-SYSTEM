import React from 'react';
import { Settings, Save, Shield, Bell, QrCode, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-400" />
            System & Facility Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global warehouse business rules, scanner wedge behaviors, and system preferences
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outbound Allocation Strategy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              <CardTitle>Inventory Allocation Business Rules</CardTitle>
            </div>
            <CardDescription>Determine default inventory reservation behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Default Outbound Strategy" helperText="Perishable goods will always enforce FEFO.">
              <Select
                defaultValue="FEFO"
                options={[
                  { value: 'FEFO', label: 'First-Expired, First-Out (FEFO)' },
                  { value: 'FIFO', label: 'First-In, First-Out (FIFO)' },
                  { value: 'LIFO', label: 'Last-In, First-Out (LIFO - Not Recommended)' }
                ]}
              />
            </FormField>

            <FormField label="Expiry Quarantine Threshold (Days)" helperText="Stock expiring within N days is auto-quarantined.">
              <Input type="number" defaultValue="30" />
            </FormField>

            <FormField label="Discrepancy Manager Approval Threshold ($)">
              <Input type="number" defaultValue="250" />
            </FormField>
          </CardContent>
        </Card>

        {/* Barcode & Scanner Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <CardTitle>Handheld Terminal & Scanner Hardware</CardTitle>
            </div>
            <CardDescription>Industrial barcode reader integration settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Scanner Input Mode">
              <Select
                defaultValue="WEDGE"
                options={[
                  { value: 'WEDGE', label: 'Keyboard Wedge (HID Burst Input)' },
                  { value: 'SPP', label: 'Serial Port Profile (Bluetooth SPP)' },
                  { value: 'CAMERA', label: 'Webcam / Device Camera Scan' }
                ]}
              />
            </FormField>

            <FormField label="Burst Keystroke Timeout (ms)" helperText="Window to differentiate scanner input from human typing.">
              <Input type="number" defaultValue="50" />
            </FormField>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
              <div>
                <div className="font-semibold text-white">Audio Chime Feedback</div>
                <div className="text-slate-400">Play confirmation tone on successful scan</div>
              </div>
              <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-900 text-brand-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
