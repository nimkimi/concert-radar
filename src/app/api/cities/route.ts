import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/nextauth";
import { searchCity } from "@/lib/nominatim";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const places = await searchCity(q);
  return NextResponse.json(places);
}
