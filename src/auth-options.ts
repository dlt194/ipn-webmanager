import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.ENTRA_CLIENT_ID!,
      clientSecret: process.env.ENTRA_CLIENT_SECRET!,
      tenantId: process.env.ENTRA_TENANT_ID!,
    }),
  ],

  session: { strategy: "jwt" },

  // Strongly recommended
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist access token (useful for calling Graph / downstream APIs)
      if (account?.access_token) token.accessToken = account.access_token;

      // Persist id_token if you need it for downstream validation
      if (account?.id_token) token.idToken = account.id_token;

      // UPN / preferred username (Entra commonly supplies preferred_username)
      const preferred = (profile as { preferred_username?: string } | null)
        ?.preferred_username;

      token.upn = preferred ?? token.email ?? token.upn ?? null;

      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      session.upn = token.upn;

      return session;
    },
  },
};
