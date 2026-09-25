// components/layout/TopBar.tsx
"use client";
import { Bell, Search, LogOut, ChevronDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface TopBarProps {
  title?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function TopBar({ title, showSearch = false, searchPlaceholder = "Search..." }: TopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center gap-4 px-6 sticky top-0 z-10">
      {/* Title */}
      {title && <h1 className="text-lg font-semibold text-text-primary mr-auto">{title}</h1>}

      {/* Search */}
      {showSearch && (
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              className="w-full pl-10 pr-4 h-9 rounded-xl border border-border bg-surface-muted text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder={searchPlaceholder}
              onKeyDown={(e) => { if (e.key === "Enter") router.push(`/search?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`); }}
            />
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/notifications" aria-label="Notifications">
            <div className="relative">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full" />
            </div>
          </Link>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-muted transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-300">
              <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                {session?.user?.name?.[0] ?? "?"}
              </div>
              <span className="text-sm font-medium text-text-primary hidden sm:block">{session?.user?.name?.split(" ")[0]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-surface border-border rounded-2xl shadow-elevated p-1">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-text-primary">{session?.user?.name}</p>
              <p className="text-xs text-text-muted">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="rounded-xl" asChild>
              <Link href="/app/profile" className="cursor-pointer">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="rounded-xl text-danger focus:text-danger cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
