import { useState, useEffect } from "react";
import { fetchApi, getUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Calendar, MapPin, Phone, Navigation, CheckCircle2, Droplet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";
import { useLocation } from "wouter";

const JOURNEY_STEPS = [
  { key: "accepted", label: "Accepted" },
  { key: "scheduled", label: "Scheduled" },
  { key: "arrived", label: "Arrived & Verified" },
  { key: "donated", label: "Blood Collected" },
  { key: "completed", label: "Completed" },
];

export default function DonorToken() {
  const user = getUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchToken = async () => {
    try {
      const data = await fetchApi("/donors/me/token");
      setTokenInfo(data);
    } catch (e) {
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchToken(); }, []);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this appointment? The slot will reopen for other donors.")) return;
    setIsCancelling(true);
    try {
      await fetchApi("/donors/me/appointment/cancel", { method: "PATCH" });
      toast({ title: "Appointment cancelled", description: "The slot has been reopened." });
      setTokenInfo(null);
      fetchToken();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStepIdx = tokenInfo ? JOURNEY_STEPS.findIndex(s => s.key === tokenInfo.journeyStatus) : -1;
  const mapsUrl = tokenInfo?.hospitalLatitude && tokenInfo?.hospitalLongitude
    ? `https://maps.google.com/maps?q=${tokenInfo.hospitalLatitude},${tokenInfo.hospitalLongitude}`
    : null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Active Appointment</h1>
        <p className="text-muted-foreground mt-1">Show this QR code to hospital staff for verification</p>
      </div>

      {!tokenInfo ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-4 opacity-30" />
            <h3 className="font-semibold text-lg text-foreground mb-2">No Active Appointment</h3>
            <p className="text-sm">Accept an emergency appeal from your dashboard to generate a QR token.</p>
            <Button className="mt-6" variant="outline" onClick={() => setLocation("/donor/dashboard")}>
              Browse Alerts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* QR Token Card */}
          <Card className="border-primary/20 shadow-xl overflow-hidden">
            <div className={`h-2 w-full ${tokenInfo.journeyStatus === "completed" ? "bg-emerald-500" : "bg-primary"}`} />
            <CardHeader className="text-center pt-6 pb-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CardTitle className="text-xl font-mono tracking-wider text-primary">
                  {tokenInfo.token.slice(-12)}
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Droplet className="w-3 h-3 mr-1 fill-current" />
                  {tokenInfo.bloodType}
                </Badge>
              </div>
              <CardDescription className="text-base font-semibold text-foreground">
                {tokenInfo.hospitalName}
              </CardDescription>
              <p className="text-sm text-muted-foreground">{tokenInfo.hospitalAddress}</p>
            </CardHeader>

            <CardContent className="flex flex-col items-center pb-6 space-y-5">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100">
                <QRCode
                  value={tokenInfo.token}
                  size={200}
                  level="H"
                  fgColor="#1a1a2e"
                />
              </div>

              {/* Journey Status */}
              <div className="w-full bg-muted/40 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Journey Status</p>
                <div className="flex items-center justify-between">
                  {JOURNEY_STEPS.map((step, idx) => {
                    const done = idx <= currentStepIdx;
                    const active = idx === currentStepIdx;
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                          done ? "bg-primary border-primary" : "border-gray-300"
                        } ${active ? "ring-2 ring-primary/30" : ""}`}>
                          {done && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <p className={`text-[10px] text-center mt-1 leading-tight ${done ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {idx < JOURNEY_STEPS.length - 1 && (
                          <div className={`hidden sm:block h-0.5 w-full mt-[-18px] ${idx < currentStepIdx ? "bg-primary" : "bg-gray-200"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Appointment Details */}
              <div className="w-full space-y-2 text-sm">
                {tokenInfo.appointmentDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong className="text-foreground">Appointment:</strong>{" "}
                      {new Date(tokenInfo.appointmentDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Token valid until:</strong>{" "}
                    {new Date(tokenInfo.expiresAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                {tokenInfo.hospitalPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <a href={`tel:${tokenInfo.hospitalPhone}`} className="text-primary font-medium hover:underline">
                      {tokenInfo.hospitalPhone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-2 pt-0 pb-5 px-5">
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <Navigation className="w-4 h-4" />
                    Directions
                  </Button>
                </a>
              )}
              {!["arrived", "donated", "completed"].includes(tokenInfo.journeyStatus) && (
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling…" : "Cancel Appointment"}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Reminders */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="font-semibold text-amber-800 text-sm mb-2">Before you go:</p>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Eat a light meal beforehand — do not donate on an empty stomach</li>
                <li>• Drink at least 500ml of water before your appointment</li>
                <li>• Carry your National ID for identity verification</li>
                <li>• Wear comfortable, loose-sleeved clothing</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
