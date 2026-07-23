'use server';

import { signOut } from "@/lib/auth";

export async function logout() {
  await signOut();
}

// getSession is now handled by the auth() function in @/lib/auth.ts
