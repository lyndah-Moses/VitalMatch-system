import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanLine, KeySquare, CheckCircle2, AlertTriangle, User, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HospitalVerify() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchApi("/hospitals/me/verify-donor", {
        method: "POST",
        body: JSON.stringify({ token })
      });
      setResult(data);
      toast({ title: "Token verified successfully" });
    } catch (err: any) {
      setError(err.message || "Invalid or expired token");
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkCollected = async () => {
    if (!result?.donationId) return;
    setIsLoading(true);
    try {
      await fetchApi(`/donations/${result.donationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "collected" })
      });
      toast({ title: "Donation marked as collected" });
      setResult({ ...result, collected: true });
    } catch (err: any) {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verify Donor</h1>
        <p className="text-muted-foreground mt-1">Scan QR code or enter token manually to confirm donor arrival.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="scan" disabled><ScanLine className="w-4 h-4 mr-2" /> Scan QR</TabsTrigger>
                <TabsTrigger value="manual"><KeySquare className="w-4 h-4 mr-2" /> Manual</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual">
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Input 
                      placeholder="Enter 6-digit donor token..." 
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                      className="text-center text-2xl tracking-[0.25em] font-mono py-6"
                      maxLength={10}
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading || !token}>
                    {isLoading ? "Verifying..." : "Verify Donor Token"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div>
          {error && (
            <Card className="border-destructive bg-destructive/5 animate-in slide-in-from-bottom-2">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-destructive mb-2">Verification Failed</h3>
                <p className="text-muted-foreground">{error}</p>
                <Button variant="outline" className="mt-6" onClick={() => setError(null)}>Try Again</Button>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="border-accent border-2 shadow-lg animate-in slide-in-from-bottom-2">
              <CardHeader className="bg-accent/5 pb-4 border-b border-accent/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                  <div>
                    <CardTitle className="text-accent">Token Validated</CardTitle>
                    <CardDescription>Donor matched to active appeal</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{result.donor?.name || "Verified Donor"}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-primary border-primary">
                        <Droplet className="w-3 h-3 mr-1 fill-current" />
                        {result.donor?.bloodType || result.appeal?.bloodType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{result.donor?.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Appeal ID</span>
                    <span className="font-medium">#{result.appeal?.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Required Type</span>
                    <span className="font-medium">{result.appeal?.bloodType}</span>
                  </div>
                </div>

                {result.collected ? (
                  <div className="w-full py-3 bg-accent/10 text-accent font-semibold text-center rounded-md border border-accent/20 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Donation Collected
                  </div>
                ) : (
                  <Button size="lg" className="w-full font-bold bg-accent hover:bg-accent/90" onClick={handleMarkCollected} disabled={isLoading}>
                    Confirm Blood Collection
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!result && !error && (
            <Card className="h-full border-dashed flex items-center justify-center text-muted-foreground">
              <CardContent className="flex flex-col items-center p-12 text-center">
                <ScanLine className="w-12 h-12 mb-4 opacity-20" />
                <p>Verify a token to see donor details here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
