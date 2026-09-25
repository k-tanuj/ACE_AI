// app/app/layout.tsx — Student app layout
import { AppShell } from "@/components/layout/AppShell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell showSearch>{children}</AppShell>;
}
