// app/app/notifications/page.tsx — Smart Notifications Feed
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Bell, Clock, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = [
    {
      id: "notif-1",
      title: "Deadline Alert: National AI Hackathon 2026",
      message: "Registration for IIT Bombay National AI Hackathon closes in 48 hours. Don't miss out on ₹5L prizes!",
      type: "DEADLINE",
      createdAt: "2 hours ago",
      isRead: false,
    },
    {
      id: "notif-2",
      title: "New AI Recommendation Match",
      message: "Based on your interest in Data Science and PyTorch, we found 2 new hackathons with >90% profile match.",
      type: "AI_RECOMMENDATION",
      createdAt: "5 hours ago",
      isRead: false,
    },
    {
      id: "notif-3",
      title: "Gamification Level Up!",
      message: "Congratulations! You reached Level 2 (Explorer) and earned 50 bonus XP for completing daily AI searches.",
      type: "GAMIFICATION",
      createdAt: "1 day ago",
      isRead: true,
    },
    {
      id: "notif-4",
      title: "Event Verified: Web3 Developer Summit",
      message: "The event you bookmarked passed AI Quality Scanning with an EQS of 92.5 and Verified Partner trust status.",
      type: "VERIFICATION",
      createdAt: "2 days ago",
      isRead: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" />
            Smart Notifications
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Personalized deadline alerts, AI recommendation updates, and verification badges.
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => {
          let Icon = Bell;
          let iconColor = "text-primary-600 bg-primary-50";

          if (notif.type === "DEADLINE") {
            Icon = Clock;
            iconColor = "text-danger bg-danger/10";
          } else if (notif.type === "AI_RECOMMENDATION") {
            Icon = Sparkles;
            iconColor = "text-primary-600 bg-primary-100";
          } else if (notif.type === "GAMIFICATION") {
            Icon = CheckCircle2;
            iconColor = "text-warning bg-warning/10";
          } else if (notif.type === "VERIFICATION") {
            Icon = ShieldCheck;
            iconColor = "text-success bg-success/10";
          }

          return (
            <Card
              key={notif.id}
              className={`border border-border transition-colors ${
                !notif.isRead ? "bg-primary-50/20 border-primary-200" : ""
              }`}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-text-primary">{notif.title}</h4>
                    <span className="text-xs text-text-muted">{notif.createdAt}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{notif.message}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
