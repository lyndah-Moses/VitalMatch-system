import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, Map as MapIcon, ShieldCheck,
  BarChart3, LogOut, Menu, X, Bell
} from "lucide-react";
import { clearAuth, fetchApi, getUser } from "@/lib/api";

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [hasActiveAppeals, setHasActiveAppeals] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const user = getUser();

  useEffect(() => {
    fetchApi("/hospitals/me/appeals")
      .then(data => {
        if (data && data.some((a: any) => a.status === "active")) setHasActiveAppeals(true);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    clearAuth();
    setLocation("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/hospital/dashboard", icon: LayoutDashboard },
    { name: "Live Map", href: "/hospital/map", icon: MapIcon },
    { name: "Verify Donor", href: "/hospital/verify", icon: ShieldCheck },
    { name: "Reports", href: "/hospital/reports", icon: BarChart3 },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
        <Activity className="w-8 h-8 text-primary flex-shrink-0" />
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground">VitalMatch</span>
      </div>

      {/* Active Alert */}
      {hasActiveAppeals && (
        <div className="mx-4 mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md flex items-center gap-2 animate-pulse">
          <Bell className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-bold tracking-wide">SOS ACTIVE</span>
        </div>
      )}

      {/* User info */}
      <div className="px-4 mt-4 mb-2">
        <div className="bg-muted/60 rounded-lg px-3 py-2.5">
          <p className="text-xs font-semibold text-sidebar-foreground">{user?.name || "Hospital"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Hospital Admin</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-1 mt-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <span
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col flex-shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50 md:hidden transition-transform duration-300 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Top Bar */}
        <header className="md:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0 z-30">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">VitalMatch</span>
          </div>
          {hasActiveAppeals && (
            <div className="flex items-center gap-1 text-destructive animate-pulse">
              <Bell className="w-4 h-4" />
              <span className="text-xs font-bold">SOS</span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
