import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

type EntraProfile = {
  preferred_username?: string;
  oid?: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.ENTRA_CLIENT_ID!,
      clientSecret: process.env.ENTRA_CLIENT_SECRET!,
      tenantId: process.env.ENTRA_TENANT_ID!,
    }),
  ],

  session: { strategy: "jwt" },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token;
      if (account?.id_token) token.idToken = account.id_token;

      const p = profile as EntraProfile | null;

      // Prefer Entra's preferred_username; fall back to token.email
      token.upn = p?.preferred_username ?? token.email ?? token.upn ?? null;

      // Optional but recommended: stable Entra object id
      token.oid = p?.oid ?? token.oid ?? null;

      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      session.upn = token.upn;
      session.oid = token.oid;

      return session;
    },
  },
};
