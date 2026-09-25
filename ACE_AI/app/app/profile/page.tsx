// app/app/profile/page.tsx — Student Profile & Academic Preferences
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { User, Mail, GraduationCap, Building, Star, Award, ShieldCheck, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, profile, gamification, badges] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.studentProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.gamificationProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.userBadge.findMany({
      where: { userId: session.user.id },
      include: { badge: true },
    }),
  ]);

  const skills = profile?.skills ? JSON.parse(profile.skills as string) : ["Python", "Machine Learning", "Web Development", "Data Structures"];
  const interests = profile?.interests ? JSON.parse(profile.interests as string) : ["Hackathons", "AI/ML", "Open Source", "Coding Contests"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* User Info Header */}
      <Card className="border border-border overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary-900 via-primary-700 to-primary-600" />
        <CardContent className="pt-0 relative px-6 pb-6">
          <div className="flex justify-between items-start -mt-12 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-primary-600 text-white font-bold text-4xl flex items-center justify-center border-4 border-white shadow-lg shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <Badge className="bg-primary-100 text-primary-700 border-primary-200 mt-14 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Student Account
            </Badge>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{user?.name}</h1>
            <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
              <Mail className="w-4 h-4" /> {user?.email}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Academic & Preference Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary-600" />
              Academic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-text-muted flex items-center gap-1.5">
                <Building className="w-4 h-4 text-primary-500" /> Institution
              </span>
              <span className="font-medium text-text-primary">{profile?.college ?? "Not set"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-text-muted">Department</span>
              <span className="font-medium text-text-primary">{profile?.department ?? "Computer Science"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-text-muted">Degree Level</span>
              <span className="font-medium text-text-primary">{profile?.graduationYear ? "B.Tech" : "Not set"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Graduation Year</span>
              <span className="font-medium text-text-primary">{profile?.graduationYear ?? 2026}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" />
              Gamification & Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-primary-50 border border-primary-100">
                <p className="text-xs text-primary-600 font-medium">Total XP</p>
                <p className="text-2xl font-bold text-primary-900 mt-1">{gamification?.xp ?? 150}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-xs text-warning font-medium">Level</p>
                <p className="text-2xl font-bold text-warning-700 mt-1">{gamification?.level ?? 1}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
                <Award className="w-4 h-4 text-info" /> Badges ({badges.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {badges.length === 0 ? (
                  <Badge variant="outline" className="text-xs">First Explorer</Badge>
                ) : (
                  badges.map((b) => (
                    <Badge key={b.badgeId} className="bg-primary-50 text-primary-700 border-primary-200">
                      {b.badge.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills & Interest Tags */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-600" />
            Skills & Opportunity Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-text-muted font-medium mb-2">Technical Skills</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium mb-2">Saved Event Interests</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest: string, i: number) => (
                <Badge key={i} className="bg-primary-50 text-primary-700 border-primary-200">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
