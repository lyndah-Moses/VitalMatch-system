import { useState, useEffect, useCallback } from "react";
import { fetchApi, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle, Clock, CheckCircle, Droplet, BarChart3, Users,
  Package, Radio, ShieldCheck, UserCheck, UserPlus, ChevronRight,
  Siren, TrendingUp, MapPin, Award, Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const JOURNEY_LABELS: Record<string, { label: string; color: string }> = {
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-700 border-blue-200" },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-700 border-purple-200" },
  arrived: { label: "Arrived", color: "bg-amber-100 text-amber-700 border-amber-200" },
  donated: { label: "Donated", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
};

const ROLES = ["Admin", "Nurse", "Reception"];

type Tab = "overview" | "appointments" | "inventory" | "discovery" | "analytics";

export default function HospitalDashboard() {
  const user = getUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [staffRole, setStaffRole] = useState("Admin");
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [appeals, setAppeals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [nearbyDonors, setNearbyDonors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [hospitalInfo, setHospitalInfo] = useState<any>(null);
  const [selectedDonors, setSelectedDonors] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryEditing, setInventoryEditing] = useState<Record<string, number>>({});

  const [newAppeal, setNewAppeal] = useState({ bloodType: "", quantity: 1, emergencyLevel: "standard", description: "" });

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [appealsData, apptData, inventoryData, mapData, statsData, hospitalData] = await Promise.all([
        fetchApi("/hospitals/me/appeals").catch(() => []),
        fetchApi("/hospitals/me/appointments").catch(() => []),
        fetchApi("/hospitals/me/inventory").catch(() => []),
        fetchApi("/hospitals/me/donors-map").catch(() => []),
        fetchApi("/hospitals/me/stats").catch(() => null),
        fetchApi("/hospitals/me").catch(() => null),
      ]);
      setAppeals(appealsData || []);
      setAppointments(apptData || []);
      setInventory(inventoryData || []);
      setNearbyDonors(mapData || []);
      setStats(statsData);
      setHospitalInfo(hospitalData);
    } catch (e) {
      toast({ title: "Failed to load dashboard", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreateAppeal = async () => {
    try {
      await fetchApi("/appeals", { method: "POST", body: JSON.stringify(newAppeal) });
      toast({ title: "Appeal published!" });
      setIsDialogOpen(false);
      setNewAppeal({ bloodType: "", quantity: 1, emergencyLevel: "standard", description: "" });
      loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateAppeal = async (id: number, status: string) => {
    try {
      await fetchApi(`/appeals/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast({ title: `Appeal ${status}` });
      loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateJourney = async (responseId: number, journeyStatus: string, donorName: string) => {
    try {
      await fetchApi(`/hospitals/me/appointments/${responseId}`, {
        method: "PATCH",
        body: JSON.stringify({ journeyStatus })
      });
      const labels: Record<string, string> = {
        arrived: "Marked as Arrived",
        donated: "Blood Collected",
        completed: "Donation Completed",
      };
      toast({ title: labels[journeyStatus] || "Status Updated", description: `${donorName}'s status updated.` });
      loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleInventoryUpdate = async (bloodType: string) => {
    const units = inventoryEditing[bloodType];
    if (units === undefined) return;
    try {
      await fetchApi(`/hospitals/me/inventory/${encodeURIComponent(bloodType)}`, {
        method: "PATCH",
        body: JSON.stringify({ units })
      });
      toast({ title: `${bloodType} inventory updated to ${units} units` });
      setInventoryEditing(prev => { const n = { ...prev }; delete n[bloodType]; return n; });
      loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkAlert = async () => {
    const count = selectedDonors.size;
    if (count === 0) return;
    toast({
      title: `Emergency Alert Sent!`,
      description: `${count} donor${count > 1 ? "s" : ""} notified near your hospital.`,
    });
    setSelectedDonors(new Set());
  };

  const activeAppeals = appeals.filter(a => a.status === "active");
  const lowStock = inventory.filter(i => i.units < 5);

  const tabsForRole: Record<string, Tab[]> = {
    Admin: ["overview", "appointments", "inventory", "discovery", "analytics"],
    Nurse: ["overview", "appointments", "inventory"],
    Reception: ["overview", "appointments"],
  };
  const visibleTabs = tabsForRole[staffRole] || tabsForRole["Admin"];

  const tabDefs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "appointments", label: "Appointments", icon: UserCheck },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "discovery", label: "Discovery", icon: Users },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{hospitalInfo?.name || user?.name || "Hospital"}</h1>
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
              <ShieldCheck className="w-3 h-3" /> Verified
            </Badge>
            {hospitalInfo?.phone && (
              <span className="text-sm text-muted-foreground">· {hospitalInfo.phone}</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {hospitalInfo?.address || "Nairobi, Kenya"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* RBAC Role Selector */}
          <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-1.5">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <Select value={staffRole} onValueChange={setStaffRole}>
              <SelectTrigger className="border-0 bg-transparent p-0 h-auto text-sm font-medium shadow-none focus:ring-0 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Emergency Mode */}
          <button
            onClick={() => setEmergencyMode(!emergencyMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
              emergencyMode
                ? "bg-destructive text-white border-destructive animate-pulse shadow-lg shadow-destructive/30"
                : "border-destructive text-destructive hover:bg-destructive/5"
            }`}
          >
            <Siren className="w-4 h-4" />
            {emergencyMode ? "🚨 EMERGENCY MODE ON" : "Emergency Mode"}
          </button>

          {/* Create Appeal */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-destructive hover:bg-destructive/90 text-white font-bold gap-2">
                <Droplet className="w-4 h-4 fill-current" /> New Appeal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Emergency Blood Appeal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Blood Type Needed</Label>
                  <Select value={newAppeal.bloodType} onValueChange={v => setNewAppeal({ ...newAppeal, bloodType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select blood type" /></SelectTrigger>
                    <SelectContent>{BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity (Units)</Label>
                  <Input type="number" min="1" value={newAppeal.quantity} onChange={e => setNewAppeal({ ...newAppeal, quantity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Level</Label>
                  <Select value={newAppeal.emergencyLevel} onValueChange={v => setNewAppeal({ ...newAppeal, emergencyLevel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input placeholder="Patient details, urgency notes..." value={newAppeal.description} onChange={e => setNewAppeal({ ...newAppeal, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAppeal} disabled={!newAppeal.bloodType}>Publish Appeal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Low Stock Alert ── */}
      {lowStock.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Low Blood Stock Alert</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {lowStock.map(i => `${i.bloodType} (${i.units} units)`).join(", ")} — Consider broadcasting emergency appeals.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Appeals", value: activeAppeals.length, icon: AlertCircle, color: "text-destructive" },
          { label: "Pending Arrivals", value: appointments.filter(a => ["accepted", "scheduled"].includes(a.journeyStatus)).length, icon: Clock, color: "text-amber-500" },
          { label: "Donations This Month", value: stats?.donationsThisMonth ?? 0, icon: Droplet, color: "text-primary" },
          { label: "Total Received", value: stats?.totalDonationsReceived ?? 0, icon: CheckCircle, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <p className="text-3xl font-black mt-1">{s.value}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 flex-wrap bg-muted/60 p-1 rounded-xl w-fit">
        {tabDefs.filter(t => visibleTabs.includes(t.key)).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-900 shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══ TAB: OVERVIEW ══ */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Current Appeals</h2>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : appeals.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="p-12 text-center text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No active appeals. You're well stocked!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {appeals.map(appeal => (
                <Card key={appeal.id} className={`overflow-hidden ${
                  appeal.status === "active"
                    ? emergencyMode
                      ? "border-destructive border-2 shadow-lg shadow-destructive/20 animate-pulse"
                      : "border-l-4 border-l-destructive shadow-sm"
                    : "opacity-60"
                }`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                          emergencyMode && appeal.status === "active"
                            ? "bg-destructive text-white"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {appeal.bloodType}
                        </div>
                        <div>
                          <h3 className="font-semibold">{appeal.quantity} Units Needed</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(appeal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={appeal.emergencyLevel === "critical" ? "destructive" : appeal.emergencyLevel === "urgent" ? "default" : "secondary"} className="capitalize">
                        {appeal.emergencyLevel}
                      </Badge>
                    </div>
                    {appeal.description && (
                      <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-2 mb-3">{appeal.description}</p>
                    )}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Donor responses</span>
                        <span className="font-semibold">{appeal.acceptedCount || 0} / {appeal.quantity}</span>
                      </div>
                      <Progress value={Math.min(100, ((appeal.acceptedCount || 0) / appeal.quantity) * 100)} className="h-1.5" />
                    </div>
                    {appeal.status === "active" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleUpdateAppeal(appeal.id, "cancelled")}>Cancel</Button>
                        <Button size="sm" className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateAppeal(appeal.id, "fulfilled")}>Mark Fulfilled</Button>
                      </div>
                    )}
                    {appeal.status !== "active" && (
                      <Badge variant="outline" className="w-full justify-center capitalize">{appeal.status}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: APPOINTMENTS ══ */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Donor Check-In Management</h2>
          {appointments.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No appointments yet. Donors who accept your appeals will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {appointments.map(appt => {
                const status = appt.journeyStatus || "accepted";
                const statusInfo = JOURNEY_LABELS[status] || JOURNEY_LABELS.accepted;
                const canMarkArrived = ["accepted", "scheduled"].includes(status);
                const canMarkDonated = status === "arrived";
                const canMarkComplete = status === "donated";
                return (
                  <Card key={appt.responseId} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                            {appt.bloodType}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{appt.donorName}</p>
                              {appt.totalDonations >= 3 && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                                  <Award className="w-3 h-3" /> Frequent Donor
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                              <span>{appt.totalDonations} donations total</span>
                              {appt.appointmentDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(appt.appointmentDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${statusInfo.color} border text-xs capitalize`}>
                            {statusInfo.label}
                          </Badge>
                          {canMarkArrived && (
                            <Button size="sm" variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleUpdateJourney(appt.responseId, "arrived", appt.donorName)}>
                              <MapPin className="w-3 h-3" /> Mark Arrived
                            </Button>
                          )}
                          {canMarkDonated && (
                            <Button size="sm" className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleUpdateJourney(appt.responseId, "donated", appt.donorName)}>
                              <Droplet className="w-3 h-3" /> Blood Collected
                            </Button>
                          )}
                          {canMarkComplete && (
                            <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary/90"
                              onClick={() => handleUpdateJourney(appt.responseId, "completed", appt.donorName)}>
                              <CheckCircle className="w-3 h-3" /> Mark Completed
                            </Button>
                          )}
                          {status === "completed" && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: INVENTORY ══ */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Blood Stock Levels</h2>
            <p className="text-xs text-muted-foreground">Critical threshold: &lt;5 units</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inventory.map(item => {
              const isLow = item.units < 5;
              const isCritical = item.units <= 2;
              const maxUnits = 20;
              const pct = Math.min(100, (item.units / maxUnits) * 100);
              const editing = inventoryEditing[item.bloodType] !== undefined;
              return (
                <Card key={item.bloodType} className={`shadow-sm ${isLow ? "border-amber-300" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                          isCritical ? "bg-destructive text-white" : isLow ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                        }`}>
                          {item.bloodType}
                        </div>
                        <div>
                          <p className="font-semibold">{item.units} units</p>
                          {isLow && <p className={`text-xs font-medium ${isCritical ? "text-destructive" : "text-amber-600"}`}>
                            {isCritical ? "⚠ Critical" : "Low stock"}
                          </p>}
                        </div>
                      </div>
                      {isLow && <Bell className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="space-y-2">
                      <Progress
                        value={pct}
                        className={`h-3 ${isCritical ? "[&>div]:bg-destructive" : isLow ? "[&>div]:bg-amber-400" : "[&>div]:bg-primary"}`}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="h-8 text-sm"
                          value={editing ? inventoryEditing[item.bloodType] : item.units}
                          onChange={e => setInventoryEditing(prev => ({ ...prev, [item.bloodType]: parseInt(e.target.value) || 0 }))}
                        />
                        <Button size="sm" className="text-xs h-8 px-3" disabled={!editing}
                          onClick={() => handleInventoryUpdate(item.bloodType)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB: DISCOVERY ══ */}
      {activeTab === "discovery" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-lg">Donor Discovery (within 10 km)</h2>
            <div className="flex items-center gap-2">
              <Button
                disabled={selectedDonors.size === 0}
                className="gap-2 bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleBulkAlert}
              >
                <Radio className="w-4 h-4" />
                Send Alert to {selectedDonors.size > 0 ? selectedDonors.size : ""} Selected
              </Button>
            </div>
          </div>

          {nearbyDonors.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No donors within 10 km with location enabled.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {/* Select All */}
                <div className="p-4 border-b border-border flex items-center gap-3 bg-muted/30">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary cursor-pointer"
                    checked={selectedDonors.size === nearbyDonors.length && nearbyDonors.length > 0}
                    onChange={e => {
                      if (e.target.checked) setSelectedDonors(new Set(nearbyDonors.map((d: any) => d.id)));
                      else setSelectedDonors(new Set());
                    }}
                  />
                  <label className="text-sm font-medium cursor-pointer">Select All ({nearbyDonors.length} donors)</label>
                </div>
                <div className="divide-y divide-border">
                  {nearbyDonors.map((donor: any) => (
                    <div key={donor.id} className={`p-4 flex items-center justify-between hover:bg-muted/40 transition-colors ${selectedDonors.has(donor.id) ? "bg-primary/5" : ""}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary cursor-pointer"
                          checked={selectedDonors.has(donor.id)}
                          onChange={e => {
                            const next = new Set(selectedDonors);
                            if (e.target.checked) next.add(donor.id);
                            else next.delete(donor.id);
                            setSelectedDonors(next);
                          }}
                        />
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {donor.bloodType}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{donor.name}</p>
                            {donor.isFrequent && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Frequent</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {donor.distanceKm} km away · {donor.totalDonations} donations
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══ TAB: ANALYTICS ══ */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <h2 className="font-semibold text-lg">Donation Analytics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* This Month vs Total */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Monthly vs Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "This Month", value: stats?.donationsThisMonth || 0, max: Math.max(stats?.totalDonationsReceived || 1, 1), color: "bg-primary" },
                  { label: "Total Received", value: stats?.totalDonationsReceived || 0, max: Math.max(stats?.totalDonationsReceived || 1, 1), color: "bg-emerald-500" },
                  { label: "Active Appeals", value: stats?.activeAppeals || 0, max: Math.max(stats?.totalAppeals || 1, 1), color: "bg-destructive" },
                ].map(item => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="font-bold text-foreground">{item.value}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${(item.value / item.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Blood Type Breakdown */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Donations by Blood Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.bloodTypeBreakdown?.length > 0 ? (
                  stats.bloodTypeBreakdown.map((item: any) => (
                    <div key={item.bloodType} className="flex items-center gap-3">
                      <span className="w-10 text-right font-bold text-primary text-sm">{item.bloodType}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(item.count / (stats?.totalDonationsReceived || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-sm font-semibold text-muted-foreground">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No donation data yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Overview */}
            <Card className="shadow-sm md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Current Blood Stock Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {inventory.map(item => {
                    const pct = Math.min(100, (item.units / 20) * 100);
                    const isCritical = item.units <= 2;
                    const isLow = item.units < 5;
                    return (
                      <div key={item.bloodType} className="flex flex-col items-center gap-2">
                        <div className="relative w-full h-20 bg-muted rounded-lg overflow-hidden flex items-end">
                          <div
                            className={`w-full rounded-lg transition-all duration-700 ${isCritical ? "bg-destructive" : isLow ? "bg-amber-400" : "bg-primary"}`}
                            style={{ height: `${Math.max(pct, 5)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-center">{item.bloodType}</span>
                        <span className={`text-xs font-semibold ${isCritical ? "text-destructive" : isLow ? "text-amber-500" : "text-muted-foreground"}`}>{item.units}u</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
