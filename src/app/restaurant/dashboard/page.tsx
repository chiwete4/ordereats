import { currentUser } from "@clerk/nextjs/server";
import { ChevronRight, RefreshCw, Store } from "lucide-react";
import { redirect } from "next/navigation";

import { RestaurantDashboardGrid } from "@/components/restaurant-dashboard-grid";
import { DashboardProfileEditButton } from "@/components/dashboard-profile-edit-button";
import { RestaurantHoursStatus } from "@/components/restaurant-hours-status";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

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
      restaurant: {
        select: {
          name: true,
          isOpen: true,
          openingTime: true,
          closingTime: true,
          operatingDays: true,
          timezone: true,
          description: true,
          phoneNumber: true,
          address: true,
          imageUrl: true,
          latitude: true,
          longitude: true,
          isVerified: true,
          payoutBankName: true,
          payoutAccountName: true,
          payoutAccountNumber: true,
          _count: {
            select: {
              menuItems: {
                where: {
                  isArchived: false,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership || !["OWNER", "STAFF"].includes(membership.role) || !membership.isActive) {
    redirect("/");
  }

  const activeRiderCount = await prisma.restaurantStaff.count({
    where: {
      restaurantId,
      role: "RIDER",
      isActive: true,
    },
  });

  const detailsComplete = Boolean(
    membership.restaurant.name.trim() &&
      membership.restaurant.description?.trim() &&
      membership.restaurant.phoneNumber?.trim() &&
      membership.restaurant.address?.trim()
  );
  const riderComplete = activeRiderCount >= 1;
  const menuComplete = membership.restaurant._count.menuItems >= 5;
  const bankComplete = Boolean(
    membership.restaurant.payoutBankName?.trim() &&
      membership.restaurant.payoutAccountName?.trim() &&
      membership.restaurant.payoutAccountNumber?.trim()
  );
  const verificationSteps = [
    { label: "Restaurant Details", complete: detailsComplete },
    { label: "Add at least 1 Rider", complete: riderComplete },
    { label: "Create your menu", complete: menuComplete },
    { label: "Add your Bank Info", complete: bankComplete },
  ];

  const clerkUser = await currentUser();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "there";
  const roleLabel = membership.role === "OWNER" ? "Restaurant Owner" : "Restaurant Staff";
  const avatarUrl = clerkUser?.imageUrl;

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-[125px]">
        <div className="h-[32px]" />

        <section
          aria-label="Dashboard overview"
          className="flex w-full items-center bg-white"
        >
          <div className="flex w-full flex-col gap-3">
            <div className="shrink-0">
              <div className="relative h-[56px] w-[56px] shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-[56px] w-[56px] rounded-full object-cover" />
                ) : (
                  <div className="grid h-[56px] w-[56px] place-items-center rounded-full bg-[#EAEAEA] text-lg font-semibold">
                    {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                  </div>
                )}
                <DashboardProfileEditButton />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 xl:flex-nowrap">
              <h1 className="whitespace-nowrap text-[22px] font-normal leading-none tracking-[-0.052em] text-black">
                Welcome, <span className="tracking-[-0.035em]">{displayName}</span>
              </h1>
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#EAEAEA] px-2.5 py-1 text-[12px] font-semibold leading-none tracking-[-0.02em] text-black">
                <Store className="h-3 w-3" strokeWidth={2.3} />
                {roleLabel}
              </div>

              <div className="hidden min-w-0 max-w-full cursor-grab select-none items-center overflow-x-auto whitespace-nowrap rounded-full border-2 border-[#EAEAEA] px-2.5 py-1 text-[12px] font-normal leading-none active:cursor-grabbing sm:inline-flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="shrink-0 text-[#808080]">Profile</span>
                <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-[#808080]" strokeWidth={2.65} />
                <span className="shrink-0 text-[#808080]">All Restaurants</span>
                <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-[#808080]" strokeWidth={2.65} />
                <span className="shrink-0 font-semibold tracking-[-2%] text-black">{membership.restaurant.name}</span>
              </div>

              <RestaurantHoursStatus
                openingTime={membership.restaurant.openingTime}
                closingTime={membership.restaurant.closingTime}
                operatingDays={membership.restaurant.operatingDays}
                timezone={membership.restaurant.timezone}
              />

              <div className="hidden min-w-4 flex-1 xl:block" />

              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#EAEAEA] px-2.5 py-1 text-[12px] font-semibold leading-none tracking-[-0.02em] text-black"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={2.3} />
                Switch to Customer
              </button>
            </div>
          </div>
        </section>

        <div className="h-[32px]" />

        <RestaurantDashboardGrid
          restaurantId={restaurantId}
          restaurant={{
            name: membership.restaurant.name,
            description: membership.restaurant.description,
            phoneNumber: membership.restaurant.phoneNumber,
            address: membership.restaurant.address,
            imageUrl: membership.restaurant.imageUrl,
            latitude: membership.restaurant.latitude,
            longitude: membership.restaurant.longitude,
            isVerified: membership.restaurant.isVerified,
            openingTime: membership.restaurant.openingTime,
            closingTime: membership.restaurant.closingTime,
            operatingDays: membership.restaurant.operatingDays,
            timezone: membership.restaurant.timezone,
            payoutBankName: membership.restaurant.payoutBankName,
            payoutAccountName: membership.restaurant.payoutAccountName,
            payoutAccountNumber: membership.restaurant.payoutAccountNumber,
          }}
          verificationSteps={verificationSteps}
        />

        <div className="h-[168px]" />
      </div>
    </main>
  );
}
