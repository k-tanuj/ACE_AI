// app/organizer/layout.tsx
import { AppShell } from "@/components/layout/AppShell";
export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell topBarTitle="Organizer Portal">{children}</AppShell>;
}
