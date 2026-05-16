import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  const userId = session.user.id;

  // Transactional delete. Concert rows are intentionally preserved — they're
  // shared across users and may still be of interest to others. The user-
  // scoped tables go in dependency order; cascade delete in the schema
  // would do this implicitly, but being explicit makes the intent obvious
  // and the failure mode easier to read.
  await prisma.$transaction([
    prisma.notificationLog.deleteMany({ where: { userId } }),
    prisma.trackedArtist.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Clear the session cookie so the response logs the user out.
  await signOut({ redirect: false });

  return NextResponse.json({ ok: true });
}
