// lib/auth.ts — NextAuth v5 configuration

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as never,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        // Update streak & lastActiveAt on successful login
        const now = new Date();
        try {
          const gam = await prisma.gamificationProfile.findUnique({ where: { userId: user.id } });
          if (gam) {
            const last = gam.lastActiveAt ? new Date(gam.lastActiveAt) : null;
            const isSameDay = last &&
              last.getFullYear() === now.getFullYear() &&
              last.getMonth() === now.getMonth() &&
              last.getDate() === now.getDate();

            if (!isSameDay) {
              const isConsecutive = last && (now.getTime() - last.getTime()) < 48 * 60 * 60 * 1000;
              const newStreak = isConsecutive ? gam.currentStreak + 1 : 1;
              await prisma.gamificationProfile.update({
                where: { userId: user.id },
                data: {
                  lastActiveAt: now,
                  currentStreak: newStreak,
                  longestStreak: Math.max(newStreak, gam.longestStreak),
                  xp: { increment: 15 },
                  weeklyXp: { increment: 15 },
                  monthlyXp: { increment: 15 },
                },
              });
            }
          } else if (user.role === "STUDENT") {
            // Auto-create gamification profile for legacy users
            await prisma.gamificationProfile.create({
              data: { userId: user.id, lastActiveAt: now, currentStreak: 1, longestStreak: 1, xp: 15 },
            });
          }
        } catch {
          // Non-fatal — login still succeeds
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      image?: string | null;
    };
  }
}
