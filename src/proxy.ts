import NextAuth from "next-auth";
import { authEdgeConfig } from "@/server/auth/edge";

const { auth } = NextAuth(authEdgeConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!api/auth|api/trpc|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
