// components/layout/AppShell.tsx
"use client";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  topBarTitle?: string;
  showSearch?: boolean;
}

export function AppShell({ children, topBarTitle, showSearch }: AppShellProps) {
  const pathname = usePathname();
  const isOnboarding = pathname?.includes("/onboarding");

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <main className="w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={topBarTitle} showSearch={showSearch} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
