import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Activity, BellRing, Trophy, MapPin, Award, Menu, User, LogOut, CheckCircle2 } from "lucide-react";
import { getUser, clearAuth } from "@/lib/api";
import AiChat from "./ai-chat";

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    setLocation("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/donor/dashboard", icon: Activity },
    { name: "QR Token", href: "/donor/token", icon: CheckCircle2 },
    { name: "Leaderboard", href: "/donor/leaderboard", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Top Navigation */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Activity className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold tracking-tight">VitalMatch</span>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/20 ${
                    location === item.href ? "bg-white/20 font-bold" : ""
                  }`}>
                    {item.name}
                  </span>
                </Link>
              ))}
              <div className="ml-4 flex items-center gap-2 pl-4 border-l border-white/20">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm hidden lg:block">{user?.name}</span>
                <button onClick={handleLogout} className="ml-2 p-2 hover:bg-white/20 rounded-md">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </nav>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md hover:bg-white/20">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-primary border-t border-white/10">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <span className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location === item.href ? "bg-white/20" : "hover:bg-white/10"
                }`}>
                  {item.name}
                </span>
              </Link>
            ))}
            <button onClick={handleLogout} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium hover:bg-white/10">
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* AICheck Floating Button */}
      <AiChat />
    </div>
  );
}
