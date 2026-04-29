import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";
import { fetchApi, setAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"donor" | "hospital">("donor");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });
      setAuth(data.token, data.user);
      if (role === "hospital") {
        setLocation("/hospital/dashboard");
      } else {
        setLocation("/donor/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">VitalMatch</CardTitle>
          <CardDescription>Connecting Life in Real-Time</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={role === "donor" ? "default" : "outline"}
                className={role === "donor" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                onClick={() => setRole("donor")}
              >
                Donor
              </Button>
              <Button
                type="button"
                variant={role === "hospital" ? "default" : "outline"}
                className={role === "hospital" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                onClick={() => setRole("hospital")}
              >
                Hospital
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm text-center text-muted-foreground">
          <div>Don't have an account?</div>
          <div className="flex gap-4">
            <Link href="/register/donor" className="text-primary hover:underline font-medium">
              Register as Donor
            </Link>
            <span>•</span>
            <Link href="/register/hospital" className="text-primary hover:underline font-medium">
              Register as Hospital
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
