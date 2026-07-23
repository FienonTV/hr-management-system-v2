import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db/prisma";
import { compare } from "bcryptjs";
import { logAudit } from "./audit";
import type { User as NextAuthUser } from "next-auth";

// Lokaler App-User, der die NextAuth-Basisfelder erweitert.
type AppUser = NextAuthUser & {
  id: string;
  tenantId: string;
  isSystemAdmin: boolean;
};

function isAppUser(user: NextAuthUser): user is AppUser {
  return "tenantId" in user && "isSystemAdmin" in user;
}

/**
 * Checks if the current IP/Email combination has exceeded the rate limit.
 * Limit: max 5 failed attempts per 15 minutes.
 */
async function isRateLimited(email: string, ipAddress: string) {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const attempts = await prisma.loginAttempt.count({
    where: {
      OR: [{ email }, { ipAddress }],
      createdAt: { gte: fifteenMinutesAgo },
    },
  });

  return attempts >= 5;
}

async function recordLoginAttempt(email: string, ipAddress: string) {
  await prisma.loginAttempt.create({
    data: { email, ipAddress },
  });
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        externalId: { label: "Firmen-ID", type: "text" },
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.externalId || !credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const externalId = credentials.externalId as string;

        const ipAddress = "unknown"; // Note: In production, get this from headers/request

        // 1. Rate Limiting Check
        if (await isRateLimited(email, ipAddress)) {
          throw new Error("Zu viele Anmeldeversuche. Bitte versuchen Sie es in 15 Minuten erneut.");
        }

        // 2. Tenant suchen anhand externalId
        const tenant = await prisma.tenant.findUnique({
          where: { externalId },
        });

        if (!tenant || !tenant.isActive) {
          await recordLoginAttempt(email, ipAddress);
          return null;
        }

        // 3. User suchen anhand tenantId + email
        const user = await prisma.user.findUnique({
          where: {
            tenantId_email: {
              tenantId: tenant.id,
              email,
            },
          },
        });

        if (!user || !user.isActive) {
          await recordLoginAttempt(email, ipAddress);
          return null;
        }

        // 4. Passwort prüfen
        const isValid = await compare(password, user.passwordHash || "");

        if (!isValid) {
          await recordLoginAttempt(email, ipAddress);
          // Audit Log for failed login
          await logAudit({
            tenantId: tenant.id,
            userId: user.id,
            action: "auth.login_failed",
            resourceType: "user",
            resourceId: user.id,
            metadata: { email },
          });
          return null;
        }

        // Successful Login: Audit Log
        await logAudit({
          tenantId: tenant.id,
          userId: user.id,
          action: "auth.login",
          resourceType: "user",
          resourceId: user.id,
          metadata: { email },
        });

        // Return user object for JWT
        return {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          isSystemAdmin: user.isSystemAdmin,
        } as AppUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && isAppUser(user)) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.isSystemAdmin = user.isSystemAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.isSystemAdmin = token.isSystemAdmin as boolean;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
  },
  pages: {
    signIn: "/login",
  },
});
