import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const currentUser = await getOrCreateCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = request.nextUrl.searchParams.get("restaurantId")?.trim();
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!restaurantId || !query || query.length < 2) return NextResponse.json({ users: [] });

  const manager = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId: currentUser.id, restaurantId } } });
  if (!manager || manager.role !== "STAFF" || !manager.isActive) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: {
      restaurantStaff: { none: { restaurantId } },
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 8,
  });

  return NextResponse.json({ users });
}
