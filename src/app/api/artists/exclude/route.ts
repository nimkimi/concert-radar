import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";

const Body = z.object({
  artistId: z.string().min(1),
  isExcluded: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  const updated = await prisma.trackedArtist.updateMany({
    where: { id: parsed.artistId, userId: session.user.id },
    data: { isExcluded: parsed.isExcluded },
  });
  if (updated.count === 0) return new NextResponse("not found", { status: 404 });

  return NextResponse.json({ ok: true });
}
