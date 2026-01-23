import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequest) {
    const url = req.nextUrl;

    // Allow these through
    if (
      url.pathname === "/login" ||
      url.pathname.startsWith("/api/auth") ||
      url.pathname.startsWith("/_next") ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/error"
    ) {
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
