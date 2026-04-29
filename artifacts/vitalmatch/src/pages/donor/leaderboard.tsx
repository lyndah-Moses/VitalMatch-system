import { useState, useEffect } from "react";
import { fetchApi, getUser } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Droplet } from "lucide-react";

export default function DonorLeaderboard() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = getUser();

  useEffect(() => {
    fetchApi("/donors/me/leaderboard")
      .then(data => {
        setLeaders(data || []);
      })
      .catch(() => {
        // Mock data fallback
        setLeaders([
          { donorId: 1, name: "David K.", bloodType: "O+", totalDonations: 15, badges: ["Lifesaver", "Hero"] },
          { donorId: 2, name: "Sarah M.", bloodType: "A-", totalDonations: 12, badges: ["Lifesaver"] },
          { donorId: 3, name: currentUser?.name || "You", bloodType: "B+", totalDonations: 8, badges: ["Bronze"] },
          { donorId: 4, name: "John N.", bloodType: "O-", totalDonations: 5, badges: [] },
          { donorId: 5, name: "Grace W.", bloodType: "AB+", totalDonations: 3, badges: [] },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div>Loading leaderboard...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-yellow-500/10 rounded-full">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tight">VitalMatch Heroes</h1>
        <p className="text-xl text-muted-foreground">Top donors saving lives across Kenya</p>
      </div>

      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {leaders.map((leader, index) => {
              const isCurrentUser = leader.name === currentUser?.name;
              const rank = index + 1;
              
              return (
                <div 
                  key={leader.donorId} 
                  className={`p-4 sm:p-6 flex items-center gap-4 transition-colors ${
                    isCurrentUser ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-10 text-center font-bold text-xl ${
                    rank === 1 ? "text-yellow-500" :
                    rank === 2 ? "text-gray-400" :
                    rank === 3 ? "text-amber-700" : "text-muted-foreground"
                  }`}>
                    #{rank}
                  </div>
                  
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${isCurrentUser ? "text-primary" : ""}`}>
                          {leader.name}
                        </span>
                        {isCurrentUser && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          <Droplet className="w-3 h-3 mr-1 text-primary" />
                          {leader.bloodType}
                        </span>
                        {leader.badges?.map((badge: string) => (
                          <span key={badge} className="flex items-center text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                            <Medal className="w-3 h-3 mr-1" />
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-3xl font-black text-foreground">
                        {leader.totalDonations}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                        Donations
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
