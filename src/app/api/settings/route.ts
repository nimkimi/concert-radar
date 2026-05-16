import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";

const RADIUS_VALUES = [25, 50, 100, 9999] as const;

const Body = z.object({
  cityName: z.string().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.union([
    z.literal(25),
    z.literal(50),
    z.literal(100),
    z.literal(9999),
  ]),
  notificationsEnabled: z.boolean(),
  notificationFrequency: z.enum(["INSTANT", "DAILY_DIGEST"]),
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

  if (!RADIUS_VALUES.includes(parsed.radiusKm)) {
    return new NextResponse("bad radius", { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      cityName: parsed.cityName,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      radiusKm: parsed.radiusKm,
      notificationsEnabled: parsed.notificationsEnabled,
      notificationFrequency: parsed.notificationFrequency,
    },
  });

  return NextResponse.json({ ok: true });
}
