import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Layers,
  ArrowRight,
  Edit2,
  Trash2,
  RefreshCw,
  Boxes,
  Lock,
  Unlock,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseZones,
  createWarehouseZone,
  getLocations,
  createLocation,
  updateLocation
} from '../api/masterData';

export const WarehousesPage: React.FC = () => {
  const { activeWarehouse, setActiveWarehouse } = useAuth();

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inspecting specific warehouse zones and locations
  const [selectedWh, setSelectedWh] = useState<any | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  // Modals state
  const [isCreateWhOpen, setIsCreateWhOpen] = useState(false);
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isCreateLocOpen, setIsCreateLocOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [whForm, setWhForm] = useState({
    code: '',
    name: '',
    address: '100 Industrial Parkway',
    city: '',
    country: 'USA',
    postalCode: '60601',
    totalAreaM2: 15000
  });

  const [zoneForm, setZoneForm] = useState({
    code: '',
    name: '',
    type: 'BULK_STORAGE',
    isTemperatureControlled: false
  });

  const [locForm, setLocForm] = useState({
    zoneId: '',
    aisle: 'A01',
    rack: 'R01',
    shelf: 'S01',
    bin: 'B01',
    pickSequence: 10,
    maxWeightKg: 500,
    maxVolumeM3: 2.0
  });

  const loadWarehouses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getWarehouses();
      setWarehouses(res.data || []);
      if (res.data?.length > 0 && !selectedWh) {
        setSelectedWh(res.data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch warehouses');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhDetails = async (whId: string) => {
    setLocationsLoading(true);
    try {
      const [zonesRes, locsRes] = await Promise.all([
        getWarehouseZones(whId),
        getLocations({ warehouseId: whId, limit: 50 })
      ]);
      setZones(zonesRes.data || []);
      setLocations(locsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load zones and bins');
    } finally {
      setLocationsLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWh) {
      loadWhDetails(selectedWh.id);
    }
  }, [selectedWh]);

  const handleCreateWhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await createWarehouse({
        ...whForm,
        code: whForm.code.toUpperCase(),
        totalAreaM2: Number(whForm.totalAreaM2)
      });
      setIsCreateWhOpen(false);
      setSuccessMsg(`Warehouse ${whForm.name} created successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadWarehouses();
    } catch (err: any) {
      setError(err.message || 'Failed to create warehouse');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWh) return;
    setActionLoading(true);
    setError(null);
    try {
      await createWarehouseZone(selectedWh.id, {
        ...zoneForm,
        code: zoneForm.code.toUpperCase()
      });
      setIsCreateZoneOpen(false);
      setSuccessMsg(`Zone ${zoneForm.name} added to ${selectedWh.name}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadWhDetails(selectedWh.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create zone');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWh) return;
    setActionLoading(true);
    setError(null);
    try {
      await createLocation({
        warehouseId: selectedWh.id,
        zoneId: locForm.zoneId || zones[0]?.id,
        aisle: locForm.aisle.toUpperCase(),
        rack: locForm.rack.toUpperCase(),
        shelf: locForm.shelf.toUpperCase(),
        bin: locForm.bin.toUpperCase(),
        pickSequence: Number(locForm.pickSequence),
        maxWeightKg: Number(locForm.maxWeightKg),
        maxVolumeM3: Number(locForm.maxVolumeM3)
      });
      setIsCreateLocOpen(false);
      setSuccessMsg(`Storage bin created!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadWhDetails(selectedWh.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create bin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (loc: any) => {
    try {
      await updateLocation(loc.id, { isLocked: !loc.isLocked });
      loadWhDetails(selectedWh.id);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle location lock');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-400" />
            Warehouses & 6-Tier Spatial Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Warehouse facilities, functional zones, aisles, racks, shelves, and canonical scannable bins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadWarehouses}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setWhForm({
                code: '',
                name: '',
                address: '100 Industrial Parkway',
                city: '',
                country: 'USA',
                postalCode: '60601',
                totalAreaM2: 15000
              });
              setIsCreateWhOpen(true);
            }}
          >
            Register Facility
          </Button>
        </div>
      </div>

      {successMsg && <Alert type="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />}
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {warehouses.map(wh => {
          const isSelected = selectedWh?.id === wh.id;
          const isSessionActive = activeWarehouse.id === wh.id;

          return (
            <Card
              key={wh.id}
              onClick={() => setSelectedWh(wh)}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-brand-500 shadow-lg shadow-brand-950/50 bg-slate-900'
                  : 'hover:border-slate-700 bg-slate-900/60'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="neutral" size="sm" className="mb-2">
                      {wh.code}
                    </Badge>
                    <CardTitle className="text-base">{wh.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {wh.city}, {wh.country}
                    </CardDescription>
                  </div>
                  {isSessionActive && (
                    <Badge variant="success" size="sm" dot>
                      Active Session
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total Area</div>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {wh.totalAreaM2?.toLocaleString()} m²
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">Structure</div>
                    <div className="font-mono font-bold text-brand-400 mt-0.5">
                      {wh.zonesCount || 0} Zones • {wh.locationsCount || 0} Bins
                    </div>
                  </div>
                </div>

                {!isSessionActive && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={e => {
                      e.stopPropagation();
                      setActiveWarehouse(wh);
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Switch Terminal Facility
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Warehouse Spatial Hierarchy Explorer */}
      {selectedWh && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-400" />
                Spatial Hierarchy: <span className="text-brand-300">{selectedWh.name}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect and generate storage zones and scannable storage bins
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  setZoneForm({ code: '', name: '', type: 'BULK_STORAGE', isTemperatureControlled: false });
                  setIsCreateZoneOpen(true);
                }}
              >
                Add Zone
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  setLocForm({
                    zoneId: zones[0]?.id || '',
                    aisle: 'A01',
                    rack: 'R01',
                    shelf: 'S01',
                    bin: 'B01',
                    pickSequence: 10,
                    maxWeightKg: 500,
                    maxVolumeM3: 2.0
                  });
                  setIsCreateLocOpen(true);
                }}
              >
                Create Bin Location
              </Button>
            </div>
          </div>

          {/* Zones Summary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {zones.map(z => (
              <div key={z.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-xs text-white flex items-center gap-2">
                    <span className="font-mono text-brand-400 font-bold">{z.code}</span>
                    <span>{z.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{z.type.replace('_', ' ')}</div>
                </div>
                {z.isTemperatureControlled && (
                  <Badge variant="info" size="sm">
                    Cold Chain
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Bins Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Storage Bins in Facility ({locations.length} Total)</CardTitle>
              <CardDescription>Canonical barcodes, coordinates, max weight capacities and lock states</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {locationsLoading ? (
                <LoadingSpinner text="Loading storage bin layout..." />
              ) : locations.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No bin locations created yet in this facility. Click 'Create Bin Location' above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canonical Barcode</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Coordinates (A-R-S-B)</TableHead>
                      <TableHead>Pick Sequence</TableHead>
                      <TableHead>Max Weight & Volume</TableHead>
                      <TableHead>Lock State</TableHead>
                      <TableHead>Occupancy</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map(loc => (
                      <TableRow key={loc.id}>
                        <TableCell className="font-mono text-xs font-bold text-brand-400">
                          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {loc.barcode}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {loc.zone?.name || 'Assigned Zone'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-white">
                          {loc.aisle}-{loc.rack}-{loc.shelf}-{loc.bin}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-purple-400">
                          #{loc.pickSequence}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          {loc.maxWeightKg} kg • {loc.maxVolumeM3} m³
                        </TableCell>
                        <TableCell>
                          <Badge variant={loc.isLocked ? 'danger' : 'success'} size="sm" dot>
                            {loc.isLocked ? 'Locked (Count)' : 'Unlocked'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={loc.isOccupied ? 'warning' : 'neutral'} size="sm">
                            {loc.isOccupied ? 'Occupied' : 'Empty'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleLock(loc)}
                            leftIcon={loc.isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          >
                            {loc.isLocked ? 'Unlock' : 'Lock'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CREATE WAREHOUSE MODAL */}
      <Modal
        isOpen={isCreateWhOpen}
        onClose={() => setIsCreateWhOpen(false)}
        title="Register New Warehouse Facility"
        description="Add a physical warehouse to your global supply chain distribution network."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsCreateWhOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateWhSubmit} isLoading={actionLoading}>
              Save Facility
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateWhSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Warehouse Code" required helperText="e.g. WH-04">
              <Input
                value={whForm.code}
                onChange={e => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
                placeholder="WH-04"
                required
              />
            </FormField>

            <FormField label="Facility Name" required>
              <Input
                value={whForm.name}
                onChange={e => setWhForm({ ...whForm, name: e.target.value })}
                placeholder="Midwest Logistics Center"
                required
              />
            </FormField>
          </div>

          <FormField label="Street Address" required>
            <Input
              value={whForm.address}
              onChange={e => setWhForm({ ...whForm, address: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="City" required>
              <Input
                value={whForm.city}
                onChange={e => setWhForm({ ...whForm, city: e.target.value })}
                placeholder="Indianapolis"
                required
              />
            </FormField>

            <FormField label="Country" required>
              <Input
                value={whForm.country}
                onChange={e => setWhForm({ ...whForm, country: e.target.value })}
                placeholder="USA"
                required
              />
            </FormField>
          </div>

          <FormField label="Total Structural Area (m²)" required>
            <Input
              type="number"
              value={whForm.totalAreaM2}
              onChange={e => setWhForm({ ...whForm, totalAreaM2: parseFloat(e.target.value) || 0 })}
              required
            />
          </FormField>
        </form>
      </Modal>

      {/* CREATE ZONE MODAL */}
      <Modal
        isOpen={isCreateZoneOpen}
        onClose={() => setIsCreateZoneOpen(false)}
        title={`Add Storage Zone to ${selectedWh?.name}`}
        description="Zones group bin locations by functionality or environmental control."
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsCreateZoneOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateZoneSubmit} isLoading={actionLoading}>
              Create Zone
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateZoneSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Zone Code" required helperText="e.g. Z-FAST">
              <Input
                value={zoneForm.code}
                onChange={e => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
                placeholder="Z-FAST"
                required
              />
            </FormField>

            <FormField label="Zone Name" required>
              <Input
                value={zoneForm.name}
                onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                placeholder="Fast Pick Face"
                required
              />
            </FormField>
          </div>

          <FormField label="Zone Type" required>
            <Select
              value={zoneForm.type}
              onChange={e => setZoneForm({ ...zoneForm, type: e.target.value })}
            >
              <option value="PICK_FACE">PICK FACE (High velocity picking)</option>
              <option value="BULK_STORAGE">BULK STORAGE (Pallet reserves)</option>
              <option value="STAGING">STAGING (Inbound/Outbound staging)</option>
              <option value="RECEIVING_DOCK">RECEIVING DOCK</option>
              <option value="SHIPPING_DOCK">SHIPPING DOCK</option>
              <option value="QUALITY_CONTROL">QUALITY CONTROL (QC)</option>
              <option value="QUARANTINE">QUARANTINE HOLD</option>
            </Select>
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="tempControlled"
              checked={zoneForm.isTemperatureControlled}
              onChange={e => setZoneForm({ ...zoneForm, isTemperatureControlled: e.target.checked })}
              className="rounded border-slate-700 bg-slate-950 text-brand-500"
            />
            <label htmlFor="tempControlled" className="text-xs text-slate-300 cursor-pointer">
              Temperature Controlled (Cold Storage / Climate Monitored)
            </label>
          </div>
        </form>
      </Modal>

      {/* CREATE LOCATION (BIN) MODAL */}
      <Modal
        isOpen={isCreateLocOpen}
        onClose={() => setIsCreateLocOpen(false)}
        title="Create Storage Bin Location"
        description="Generates a 6-tier canonical location coordinate in the warehouse."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setIsCreateLocOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateLocSubmit} isLoading={actionLoading}>
              Save Bin
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateLocSubmit} className="space-y-3">
          <FormField label="Assign to Zone" required>
            <Select
              value={locForm.zoneId}
              onChange={e => setLocForm({ ...locForm, zoneId: e.target.value })}
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>
                  {z.code} - {z.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-4 gap-2">
            <FormField label="Aisle" required helperText="e.g. A01">
              <Input
                value={locForm.aisle}
                onChange={e => setLocForm({ ...locForm, aisle: e.target.value.toUpperCase() })}
                required
              />
            </FormField>

            <FormField label="Rack" required helperText="e.g. R01">
              <Input
                value={locForm.rack}
                onChange={e => setLocForm({ ...locForm, rack: e.target.value.toUpperCase() })}
                required
              />
            </FormField>

            <FormField label="Shelf" required helperText="e.g. S01">
              <Input
                value={locForm.shelf}
                onChange={e => setLocForm({ ...locForm, shelf: e.target.value.toUpperCase() })}
                required
              />
            </FormField>

            <FormField label="Bin" required helperText="e.g. B01">
              <Input
                value={locForm.bin}
                onChange={e => setLocForm({ ...locForm, bin: e.target.value.toUpperCase() })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Pick Sequence" helperText="Travel routing order">
              <Input
                type="number"
                value={locForm.pickSequence}
                onChange={e => setLocForm({ ...locForm, pickSequence: parseInt(e.target.value) || 10 })}
              />
            </FormField>

            <FormField label="Max Weight (kg)">
              <Input
                type="number"
                value={locForm.maxWeightKg}
                onChange={e => setLocForm({ ...locForm, maxWeightKg: parseFloat(e.target.value) || 500 })}
              />
            </FormField>

            <FormField label="Max Volume (m³)">
              <Input
                type="number"
                step="0.1"
                value={locForm.maxVolumeM3}
                onChange={e => setLocForm({ ...locForm, maxVolumeM3: parseFloat(e.target.value) || 2.0 })}
              />
            </FormField>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400">Generated Canonical Barcode:</span>
            <span className="font-mono font-bold text-brand-400">
              {selectedWh?.code}-{zones.find(z => z.id === locForm.zoneId)?.code || 'ZONE'}-{locForm.aisle}-{locForm.rack}-{locForm.shelf}-{locForm.bin}
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
};
