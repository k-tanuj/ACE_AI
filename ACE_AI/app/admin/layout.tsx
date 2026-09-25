// app/admin/layout.tsx
import { AppShell } from "@/components/layout/AppShell";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell topBarTitle="Admin Portal">{children}</AppShell>;
}
