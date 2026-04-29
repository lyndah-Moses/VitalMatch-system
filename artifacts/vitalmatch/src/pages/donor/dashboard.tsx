import { useState, useEffect } from "react";
import { fetchApi, getUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Clock, AlertTriangle, Activity, Droplet, Phone, CheckCircle2,
  Calendar, ChevronRight, BellRing, Gift, Award, Navigation, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Journey Status Stepper ───────────────────────────────────────────────────
const JOURNEY_STEPS = [
  { key: "accepted", label: "Accepted", icon: CheckCircle2, desc: "You have accepted the appeal." },
  { key: "scheduled", label: "Scheduled", icon: Calendar, desc: "Your appointment is confirmed." },
  { key: "arrived", label: "Arrived & Verified", icon: MapPin, desc: "Hospital has scanned your QR code." },
  { key: "donated", label: "Donated", icon: Droplet, desc: "Blood collected successfully." },
  { key: "completed", label: "Completed", icon: Award, desc: "Your blood has saved a life!" },
];

function JourneyStepper({ status }: { status: string }) {
  const currentIdx = JOURNEY_STEPS.findIndex(s => s.key === status);
  return (
    <div className="space-y-1">
      {JOURNEY_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                done ? "bg-primary border-primary text-primary-foreground" : "border-gray-300 text-gray-300"
              } ${active ? "ring-4 ring-primary/20" : ""}`}>
                <Icon className="w-4 h-4" />
              </div>
              {idx < JOURNEY_STEPS.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${idx < currentIdx ? "bg-primary" : "bg-gray-200"}`} />
              )}
            </div>
            <div className="pt-1 pb-4">
              <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              {active && <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cooldown Circle ───────────────────────────────────────────────────────────
function CooldownCircle({ daysLeft }: { daysLeft: number }) {
  const progress = ((56 - daysLeft) / 56) * 100;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-primary">{daysLeft}</span>
          <span className="text-[10px] text-muted-foreground font-medium">days</span>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground max-w-[120px]">
        Save another life in <strong>{daysLeft} days</strong>
      </p>
    </div>
  );
}

// ─── Eligibility Modal ─────────────────────────────────────────────────────────
const MOCK_SLOTS = [
  "Today 10:00 AM", "Today 2:00 PM", "Today 4:30 PM",
  "Tomorrow 9:00 AM", "Tomorrow 11:30 AM", "Tomorrow 3:00 PM",
];

function EligibilityModal({
  appeal,
  onClose,
  onConfirm,
}: {
  appeal: any;
  onClose: () => void;
  onConfirm: (appointmentDate: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [checks, setChecks] = useState({ weight: false, healthy: false, cooldown: false });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const allChecked = checks.weight && checks.healthy && checks.cooldown;

  const slotToDate = (slot: string) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isToday = slot.startsWith("Today");
    const base = isToday ? now : tomorrow;
    const timePart = slot.replace(/^(Today|Tomorrow)\s/, "");
    const [time, meridian] = timePart.split(" ");
    const [hrs, mins] = time.split(":").map(Number);
    const adjustedHrs = meridian === "PM" && hrs !== 12 ? hrs + 12 : hrs;
    base.setHours(adjustedHrs, mins, 0, 0);
    return base.toISOString();
  };

  const mapsUrl = appeal.hospitalLatitude && appeal.hospitalLongitude
    ? `https://maps.google.com/maps?q=${appeal.hospitalLatitude},${appeal.hospitalLongitude}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(appeal.hospitalAddress)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold">{appeal.hospitalName}</h2>
              <p className="text-sm opacity-80 mt-0.5">{appeal.hospitalAddress}</p>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-base px-3 py-1">
              <Droplet className="w-3 h-3 mr-1 fill-current" />
              {appeal.bloodType}
            </Badge>
          </div>
          {/* Progress Dots */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
          <p className="text-xs opacity-70 mt-1">
            Step {step} of 3 — {step === 1 ? "Eligibility Check" : step === 2 ? "Schedule Appointment" : "Confirmation"}
          </p>
        </div>

        {/* Step 1: Eligibility */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Quick Eligibility Check</h3>
            <p className="text-sm text-muted-foreground">Please confirm all three before proceeding.</p>
            {[
              { key: "weight", label: "My weight is over 50 kg" },
              { key: "healthy", label: "I have not been ill in the last 48 hours" },
              { key: "cooldown", label: "My last donation was more than 56 days ago" },
            ].map(item => (
              <label key={item.key} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                checks[item.key as keyof typeof checks]
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  checks[item.key as keyof typeof checks] ? "bg-primary border-primary" : "border-gray-300"
                }`}>
                  {checks[item.key as keyof typeof checks] && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checks[item.key as keyof typeof checks]}
                  onChange={e => setChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                />
                <span className="text-sm font-medium">{item.label}</span>
              </label>
            ))}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" disabled={!allChecked} onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Choose a Time Slot</h3>
            <p className="text-sm text-muted-foreground">Pick the most convenient time for your visit.</p>
            <div className="grid grid-cols-2 gap-2">
              {MOCK_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3 rounded-xl text-sm font-medium border-2 text-left transition-all ${
                    selectedSlot === slot
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 mb-1 opacity-60" />
                  {slot}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" disabled={!selectedSlot} onClick={() => setStep(3)}>
                Confirm Slot
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="p-6 space-y-4">
            <div className="text-center py-2">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl">You're all set!</h3>
              <p className="text-muted-foreground text-sm mt-1">Your appointment is booked.</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hospital</span>
                <span className="font-semibold">{appeal.hospitalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Slot</span>
                <span className="font-semibold">{selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Blood Type Needed</span>
                <span className="font-semibold">{appeal.bloodType}</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">Remember to:</p>
              <p>• Eat a light meal before your appointment</p>
              <p>• Bring your National ID for verification</p>
              <p>• Stay hydrated — drink water beforehand</p>
            </div>
            <div className="flex gap-3 pt-1">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </Button>
              </a>
              <Button
                className="flex-1"
                onClick={() => {
                  if (selectedSlot) onConfirm(slotToDate(selectedSlot));
                }}
              >
                Book & Get QR
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DonorDashboard() {
  const user = getUser();
  const { toast } = useToast();
  const [appeals, setAppeals] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"alerts" | "journey" | "history">("alerts");
  const [selectedAppeal, setSelectedAppeal] = useState<any>(null);

  const loadData = async () => {
    try {
      const [appealsData, donationsData, profileData, tokenData] = await Promise.all([
        fetchApi("/appeals/nearby").catch(() => []),
        fetchApi("/donors/me/donations").catch(() => []),
        fetchApi("/donors/me").catch(() => null),
        fetchApi("/donors/me/token").catch(() => null),
      ]);
      setAppeals(appealsData || []);
      setDonations(donationsData || []);
      setProfile(profileData);
      setAppointment(tokenData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAcceptWithAppointment = async (appeal: any, appointmentDate: string) => {
    setSelectedAppeal(null);
    try {
      await fetchApi(`/appeals/${appeal.id}/respond`, {
        method: "POST",
        body: JSON.stringify({ action: "accept", appointmentDate })
      });
      toast({
        title: "Appointment booked!",
        description: "Your QR token is ready. Head to the QR Token tab.",
      });
      loadData();
      setActiveTab("journey");
    } catch (e: any) {
      toast({ title: "Failed to book", description: e.message, variant: "destructive" });
    }
  };

  const handleDecline = async (appealId: number) => {
    try {
      await fetchApi(`/appeals/${appealId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action: "decline" })
      });
      toast({ title: "Appeal declined." });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const isEligible = profile?.isEligible !== false;
  const cooldownDaysLeft = profile?.cooldownDaysLeft || 0;
  const bloodType = profile?.bloodType || user?.bloodType || "—";

  return (
    <div className="space-y-6 pb-8">
      {/* ── Welcome Card ── */}
      <Card className={`border-l-8 ${isEligible ? "border-l-primary bg-primary/5" : "border-l-yellow-500 bg-yellow-50"} shadow-sm`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Hello, {profile?.name || user?.name || "Donor"}!</h2>
              <p className="text-muted-foreground mt-1">
                {isEligible
                  ? "You are eligible to save a life today."
                  : `You are in your recovery period. Rest up!`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {!isEligible && cooldownDaysLeft > 0 && (
                <CooldownCircle daysLeft={cooldownDaysLeft} />
              )}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex flex-col items-center justify-center shadow-md">
                  <span className="text-[11px] opacity-80">Type</span>
                  <span className="text-xl font-bold leading-tight">{bloodType}</span>
                </div>
                <div className="text-center bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-border">
                  <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Donations</span>
                  <span className="text-2xl font-black text-primary">{profile?.totalDonations || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          {profile?.badges && profile.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
              {profile.badges.map((badge: string) => (
                <span key={badge} className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Smart Reminders ── */}
      {appointment && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <BellRing className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Appointment Reminders</p>
                <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                  <li>• Eat a light meal before your appointment at <strong>{appointment.hospitalName}</strong></li>
                  <li>• Carry your National ID for verification</li>
                  <li>• Drink plenty of water — stay hydrated</li>
                  {appointment.appointmentDate && (
                    <li>• Your slot: <strong>{new Date(appointment.appointmentDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong></li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted/60 p-1 rounded-xl w-fit">
        {[
          { key: "alerts", label: "Alerts", icon: AlertTriangle },
          { key: "journey", label: "My Journey", icon: Activity },
          { key: "history", label: "History", icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
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

      {/* ── Tab: Emergency Alerts ── */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {appeals.length === 0 ? (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No active emergencies near you right now.</p>
                <p className="text-sm mt-1">We'll show alerts when blood matching your type is needed.</p>
              </CardContent>
            </Card>
          ) : (
            appeals.map(appeal => (
              <Card key={appeal.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-1.5 w-full ${
                  appeal.emergencyLevel === "critical" ? "bg-destructive" :
                  appeal.emergencyLevel === "urgent" ? "bg-orange-500" : "bg-blue-500"
                }`} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{appeal.hospitalName}</h4>
                        <Badge variant="outline" className={`text-xs capitalize ${
                          appeal.emergencyLevel === "critical" ? "border-red-300 text-red-600" :
                          appeal.emergencyLevel === "urgent" ? "border-orange-300 text-orange-600" : "border-blue-300 text-blue-600"
                        }`}>
                          {appeal.emergencyLevel}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {appeal.distanceKm !== null ? `${appeal.distanceKm.toFixed(1)} km away` : appeal.hospitalAddress}
                        </span>
                        {appeal.travelTimeMins !== null && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Clock className="w-3 h-3" />
                            ~{appeal.travelTimeMins} min travel
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary text-base py-1.5 px-3">
                      <Droplet className="w-3 h-3 mr-1 fill-current" />
                      {appeal.bloodType}
                    </Badge>
                  </div>

                  {appeal.description && (
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{appeal.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-semibold"
                      onClick={() => setSelectedAppeal(appeal)}
                      disabled={!isEligible}
                    >
                      {isEligible ? "Accept Appeal" : `Eligible in ${cooldownDaysLeft}d`}
                    </Button>
                    <Button variant="outline" onClick={() => handleDecline(appeal.id)}>
                      Decline
                    </Button>
                    {appeal.hospitalPhone && (
                      <a href={`tel:${appeal.hospitalPhone}`}>
                        <Button variant="outline" size="icon" title={`Call ${appeal.hospitalName}`}>
                          <Phone className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    <a
                      href={`https://maps.google.com/maps?q=${appeal.hospitalLatitude},${appeal.hospitalLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="icon" title="Get Directions">
                        <Navigation className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Tab: My Journey ── */}
      {activeTab === "journey" && (
        <div className="space-y-4">
          {!appointment ? (
            <Card className="border-dashed shadow-none bg-transparent">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Droplet className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No active appointment.</p>
                <p className="text-sm mt-1">Accept an emergency appeal to start your journey.</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("alerts")}>
                  View Alerts
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Donation Journey</CardTitle>
                </CardHeader>
                <CardContent>
                  <JourneyStepper status={appointment.journeyStatus || "accepted"} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Appointment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hospital</span>
                      <span className="font-semibold">{appointment.hospitalName}</span>
                    </div>
                    {appointment.appointmentDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduled At</span>
                        <span className="font-semibold">
                          {new Date(appointment.appointmentDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blood Type</span>
                      <span className="font-semibold">{appointment.bloodType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Valid Until</span>
                      <span className="font-semibold">
                        {appointment.expiresAt
                          ? new Date(appointment.expiresAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {appointment.hospitalPhone && (
                      <a href={`tel:${appointment.hospitalPhone}`} className="flex-1">
                        <Button variant="outline" className="w-full gap-2">
                          <Phone className="w-4 h-4" />
                          Contact Hospital
                        </Button>
                      </a>
                    )}
                    <a
                      href={`https://maps.google.com/maps?q=${appointment.hospitalLatitude},${appointment.hospitalLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button className="w-full gap-2">
                        <Navigation className="w-4 h-4" />
                        Get Directions
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Tab: History ── */}
      {activeTab === "history" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Donation History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {donations.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Gift className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No donation history yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {donations.map(donation => (
                  <div key={donation.id} className="p-5 flex items-center justify-between hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Droplet className="w-5 h-5 text-primary fill-primary/40" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{donation.hospitalName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(donation.donatedAt || donation.updatedAt).toLocaleDateString([], { dateStyle: "medium" })}
                          <span className="mx-1">·</span>
                          <Droplet className="w-3 h-3 fill-current" />
                          {donation.bloodType}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`capitalize ${
                      donation.status === "transfused" ? "bg-green-100 text-green-700 border-green-200" :
                      donation.status === "completed" ? "bg-primary/10 text-primary border-primary/20" : ""
                    }`}>
                      {donation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Eligibility Modal ─── */}
      {selectedAppeal && (
        <EligibilityModal
          appeal={selectedAppeal}
          onClose={() => setSelectedAppeal(null)}
          onConfirm={(date) => handleAcceptWithAppointment(selectedAppeal, date)}
        />
      )}
    </div>
  );
}
