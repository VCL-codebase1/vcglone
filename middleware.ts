import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { roleHome } from "@/lib/routes";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (pathname === "/login" && token?.role) {
      return NextResponse.redirect(new URL(roleHome(token.role), req.url));
    }

    if (pathname.startsWith("/admin") && !["HR_ADMIN", "SUPER_ADMIN"].includes(String(token?.role))) {
      return NextResponse.redirect(new URL(roleHome(token?.role as never), req.url));
    }
    if (pathname.startsWith("/manager") && !["MANAGER", "HR_ADMIN", "SUPER_ADMIN"].includes(String(token?.role))) {
      return NextResponse.redirect(new URL(roleHome(token?.role as never), req.url));
    }
    if (pathname.startsWith("/employee") && !token?.role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === "/login") return true;
        return Boolean(token);
      }
    },
    pages: {
      signIn: "/login"
    }
  }
);

export const config = {
  matcher: ["/login", "/employee/:path*", "/manager/:path*", "/admin/:path*"]
};
