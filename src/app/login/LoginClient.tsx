"use client";

import { signIn } from "next-auth/react";

export default function LoginClient() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border p-6 space-y-4">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your Microsoft account to continue.
        </p>
        <button
          className="w-full rounded-md border px-4 py-2"
          onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
        >
          Sign in with Microsoft
        </button>
      </div>
    </main>
  );
}
