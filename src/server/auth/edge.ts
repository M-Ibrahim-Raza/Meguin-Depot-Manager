import type { NextAuthConfig } from "next-auth";

export const authEdgeConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Bounds how long a deactivated user's existing session keeps working
    // (JWT sessions aren't revoked server-side) to about one work day.
    maxAge: 60 * 60 * 8,
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isOnLogin = pathname === "/login";

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
