import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  return { ok: true as const, userId, email };
}

export async function getOptionalActor() {
  const { userId } = await auth();
  return { userId: userId ?? null };
}
