import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const leftBlocks = [
  { id: 1, height: 346 },
  { id: 3, height: 682 },
  { id: 5, height: 535 },
  { id: 7, height: 337 },
  { id: 9, height: 337 },
];

const rightBlocks = [
  { id: 2, height: 422 },
  { id: 4, height: 527 },
  { id: 6, height: 350 },
  { id: 8, height: 350 },
  { id: 10, height: 594 },
];

function PlaceholderBlock({ id, height }: { id: number; height: number }) {
  return (
    <section
      aria-label={`Dashboard section ${id}`}
      className="flex w-full items-center justify-center rounded-[12px] bg-[#d9d9d9]"
      style={{ height }}
    >
      <span className="text-[clamp(2.5rem,5vw,5rem)] font-semibold tracking-[-0.06em] text-black">
        #{id}
      </span>
    </section>
  );
}

export default async function RestaurantDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/");

  const { restaurantId } = await searchParams;
  if (!restaurantId) redirect("/restaurant/new");

  const membership = await prisma.restaurantStaff.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!membership || !["OWNER", "STAFF"].includes(membership.role) || !membership.isActive) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-[150px]">
        <div className="h-[56px]" />

        <section
          aria-label="Dashboard overview"
          className="flex h-[112px] w-full items-center justify-center bg-[#d9d9d9]"
        >
          <span className="text-[clamp(2.5rem,5vw,5rem)] font-semibold tracking-[-0.06em] text-black">
            0
          </span>
        </section>

        <div className="h-[56px]" />

        <div className="rounded-[16px] border-[2px] border-[#bdbdbd] p-0">
          <div className="grid items-start gap-x-[36px] lg:grid-cols-[minmax(0,1069fr)_minmax(0,422fr)]">
            <div className="flex min-w-0 flex-col gap-[20px]">
              {leftBlocks.map((block) => (
                <PlaceholderBlock key={block.id} {...block} />
              ))}
            </div>

            <div className="mt-[20px] flex min-w-0 flex-col gap-[20px] lg:mt-0 lg:gap-[60px]">
              {rightBlocks.map((block) => (
                <PlaceholderBlock key={block.id} {...block} />
              ))}
            </div>
          </div>
        </div>

        <div className="h-[168px]" />
      </div>
    </main>
  );
}
