import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    // Protect everything EXCEPT: login page, next assets, and auth endpoints
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
