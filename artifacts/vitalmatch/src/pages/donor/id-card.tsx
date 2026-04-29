import { useEffect, useState } from "react";
import { fetchApi, getUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplet, ShieldCheck, Calendar, Clock, User, Award, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";

export default function DonorIDCard() {
  const user = getUser();
  const [donor, setDonor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/donors/me")
      .then(setDonor)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="text-center mt-16 text-muted-foreground">
        <p>Failed to load your profile. Please try again.</p>
      </div>
    );
  }

  const lastDate = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
  const nextEligible = lastDate ? new Date(lastDate.getTime() + 56 * 86400000) : null;
  const isEligible = !nextEligible || nextEligible <= new Date();

  const qrPayload = JSON.stringify({
    network: "VitalMatch",
    donorId: donor.id,
    name: user?.name || "Donor",
    bloodType: donor.bloodType,
    eligible: isEligible,
    totalDonations: donor.totalDonations,
    verifiedAt: new Date().toISOString(),
  });

  const bloodColors: Record<string, string> = {
    "O-": "bg-red-700", "O+": "bg-red-600",
    "A-": "bg-rose-700", "A+": "bg-rose-600",
    "B-": "bg-orange-700", "B+": "bg-orange-600",
    "AB-": "bg-purple-700", "AB+": "bg-purple-600",
  };
  const bloodBg = bloodColors[donor.bloodType] || "bg-red-600";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Digital Donor ID</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Any VitalMatch hospital can scan this to instantly retrieve your donor profile
        </p>
      </div>

      {/* ID Card */}
      <Card className="overflow-hidden shadow-2xl border-0">
        {/* Card Header with blood type */}
        <div className={`${bloodBg} px-6 py-5 flex items-center justify-between text-white`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Droplet className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">VitalMatch Network</p>
              <p className="text-2xl font-black tracking-tight">{donor.bloodType}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Donor ID</p>
            <p className="font-mono text-sm font-bold">{`VMD-${String(donor.id).padStart(5, "0")}`}</p>
          </div>
        </div>

        {/* Card Body */}
        <CardContent className="p-0">
          <div className="flex">
            {/* Left: info */}
            <div className="flex-1 p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</p>
                <p className="font-semibold text-lg">{user?.name || "Donor"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Blood Type</p>
                  <p className="font-bold text-red-600 text-lg">{donor.bloodType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Donations</p>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-amber-500" />
                    <p className="font-bold">{donor.totalDonations}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Eligibility</p>
                <Badge
                  className={isEligible
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"}
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {isEligible ? "Eligible to Donate" : "Cooling Down"}
                </Badge>
              </div>

              {lastDate && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Donation</p>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <p>{lastDate.toLocaleDateString([], { dateStyle: "medium" })}</p>
                  </div>
                </div>
              )}

              {!isEligible && nextEligible && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Next Eligible</p>
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <Clock className="w-3.5 h-3.5" />
                    <p>{nextEligible.toLocaleDateString([], { dateStyle: "medium" })}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: QR */}
            <div className="flex flex-col items-center justify-center p-4 border-l border-dashed bg-gray-50">
              <div className="bg-white p-2 rounded-lg shadow-sm border">
                <QRCode value={qrPayload} size={110} level="H" fgColor="#1a1a2e" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center leading-tight">
                Scan at any<br />VitalMatch facility
              </p>
            </div>
          </div>

          {/* Footer strip */}
          <div className="bg-muted/30 px-5 py-3 flex items-center justify-between border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Verified by VitalMatch Network</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {donor.badges && donor.badges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Your Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {donor.badges.map((badge: string) => (
                <Badge key={badge} variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Your Digital Donor ID permanently identifies you across the VitalMatch network.
              Hospital staff can scan the QR code to instantly verify your blood type, eligibility status,
              and donation history — eliminating repeated manual data entry.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
