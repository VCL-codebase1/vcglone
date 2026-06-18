import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? undefined : "dev-only-vcglone-auth-secret");

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 10
  },
  pages: {
    signIn: "/login"
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            role: true,
            departmentId: true,
            managerId: true,
            employmentStatus: true
          }
        });
        if (!user || user.employmentStatus !== "ACTIVE") return null;

        const validPassword = await compare(parsed.data.password, user.passwordHash);
        if (!validPassword) return null;

        await createAuditLog({
          actorId: user.id,
          action: "USER_LOGIN",
          entityType: "User",
          entityId: user.id,
          metadata: { email: user.email }
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          departmentId: user.departmentId,
          managerId: user.managerId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.departmentId = user.departmentId;
        token.managerId = user.managerId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.departmentId = token.departmentId;
        session.user.managerId = token.managerId;
      }
      return session;
    }
  }
};
