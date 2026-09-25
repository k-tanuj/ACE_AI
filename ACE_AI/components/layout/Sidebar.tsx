// components/layout/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Compass, Bookmark, Calendar, Bell, MessageCircle,
  User, TrendingUp, Trophy, Target, Briefcase, Plus, Wand2, BarChart3,
  ShieldCheck, Users, Settings, FileText, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STUDENT_NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/saved", label: "Saved", icon: Bookmark },
  { href: "/app/calendar", label: "Calendar", icon: Calendar },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/chat", label: "ACE Chat", icon: MessageCircle },
  { href: "/app/profile", label: "Profile", icon: User },
  { href: "/app/progress", label: "Progress", icon: TrendingUp },
  { href: "/app/challenges", label: "Challenges", icon: Target },
  { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
];

const ORGANIZER_NAV = [
  { href: "/organizer", label: "Overview", icon: LayoutDashboard },
  { href: "/organizer/events", label: "My Events", icon: Briefcase },
  { href: "/organizer/events/new", label: "Create Event", icon: Plus },
  { href: "/organizer/content-assistant", label: "AI Content", icon: Wand2 },
  { href: "/organizer/analytics", label: "Analytics", icon: BarChart3 },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldCheck },
  { href: "/admin/events", label: "Events", icon: FileText },
  { href: "/admin/organizers", label: "Organizers", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const nav = role === "ADMIN" ? ADMIN_NAV : role === "ORGANIZER" ? ORGANIZER_NAV : STUDENT_NAV;
  const portalLabel = role === "ADMIN" ? "Admin Portal" : role === "ORGANIZER" ? "Organizer Portal" : "Student Portal";

  return (
    <aside className="w-60 h-screen flex flex-col bg-surface border-r border-border sticky top-0 z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-base text-text-primary">ACE AI</span>
          <p className="text-[10px] text-text-muted leading-none mt-0.5">{portalLabel}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/app" || href === "/organizer" || href === "/admin"
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary-100 text-primary-700 shadow-sm"
                  : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User info */}
      <div className="p-3 border-t border-border">
        <Link
          href={role === "STUDENT" ? "/app/profile" : "#"}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted transition-all duration-150 group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {session?.user?.name?.[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{session?.user?.name}</p>
            <p className="text-xs text-text-muted truncate">{session?.user?.email}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
