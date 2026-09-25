// app/app/leaderboard/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Trophy, Flame, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_NAMES } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const topStudents = await prisma.gamificationProfile.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { xp: "desc" },
    take: 20,
  });

  const myRank = topStudents.findIndex((s) => s.userId === session.user.id) + 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-warning to-warning/60 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leaderboard</h1>
          <p className="text-sm text-text-muted">Weekly XP rankings among ACE AI students</p>
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {topStudents.slice(0, 3).map((s, i) => {
          const colors = ["bg-warning/10 border-warning/30", "bg-surface-muted border-border", "bg-orange-500/10 border-orange-200"];
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={s.id} className={cn("p-4 rounded-2xl border-2 text-center", colors[i], i === 0 ? "scale-105" : "")}>
              <div className="text-2xl mb-1">{medals[i]}</div>
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm mx-auto mb-2">
                {s.user.name[0]}
              </div>
              <p className="text-xs font-semibold text-text-primary truncate">{s.user.name}</p>
              <p className="text-sm font-bold text-primary-700 mt-1">{s.xp} XP</p>
              <p className="text-[10px] text-text-muted">Lv {s.level}</p>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <Card>
        <CardContent className="p-0">
          {topStudents.map((s, i) => {
            const isMe = s.userId === session.user.id;
            return (
              <div key={s.id} className={cn("flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 transition-colors", isMe ? "bg-primary-50" : "")}>
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0", i < 3 ? "bg-warning text-white" : "bg-surface-muted text-text-muted")}>
                  {i + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {s.user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", isMe ? "text-primary-700" : "text-text-primary")}>
                    {s.user.name} {isMe && <span className="text-[10px] text-primary-500 font-normal">(you)</span>}
                  </p>
                  <p className="text-xs text-text-muted">{LEVEL_NAMES[s.level] ?? "Explorer"} · Lv {s.level}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.currentStreak > 0 && (
                    <span className="flex items-center gap-1 text-xs text-danger">
                      <Flame className="w-3 h-3" /> {s.currentStreak}
                    </span>
                  )}
                  <span className="text-sm font-bold text-text-primary">{s.xp} XP</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {myRank > 20 && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl px-5 py-3 text-sm text-primary-700 text-center">
          Your rank: #{myRank} — Keep earning XP to climb the leaderboard!
        </div>
      )}
    </div>
  );
}
