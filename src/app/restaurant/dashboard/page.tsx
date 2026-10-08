import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Check, ChevronDown, ChevronRight, RefreshCw, Store } from "lucide-react";
import { redirect } from "next/navigation";

import { RestaurantDashboardGrid } from "@/components/restaurant-dashboard-grid";
import { DashboardProfileEditButton } from "@/components/dashboard-profile-edit-button";
import { DashboardLiveRefresh } from "@/components/dashboard-live-refresh";
import { RestaurantHoursStatus } from "@/components/restaurant-hours-status";
import { RestaurantPayoutSettingsButton } from "@/components/restaurant-payout-settings-button";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isSeededBazeRestaurant } from "@/lib/demo-restaurant-access";
import { ensureDemoRestaurantEmployees } from "@/lib/demo-restaurant-employees";

export default async function RestaurantDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/");

  // The seeded restaurant data is a shared demo workspace. Any active
  // Mama's Kitchen owner/staff account can switch across every restaurant
  // currently present in the database.
  const demoAccessMembership = await prisma.restaurantStaff.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId:
          (await prisma.restaurant.findFirst({
            where: { name: "Mama's Kitchen" },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          }))?.id ?? "",
      },
    },
    select: { role: true, isActive: true },
  });

  const hasDemoWorkspaceAccess = Boolean(
    demoAccessMembership?.isActive &&
    ["OWNER", "STAFF"].includes(demoAccessMembership.role)
  );

  if (hasDemoWorkspaceAccess) {
    const campusRestaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true, address: true, isVerified: true },
      orderBy: { createdAt: "asc" },
    });

    await prisma.$transaction(
      campusRestaurants.map((restaurant) =>
        prisma.restaurantStaff.upsert({
          where: {
            userId_restaurantId: {
              userId: user.id,
              restaurantId: restaurant.id,
            },
          },
          update: { isActive: true },
          create: {
            userId: user.id,
            restaurantId: restaurant.id,
            role: demoAccessMembership.role,
            isActive: true,
          },
        })
      )
    );

    // Create persistent, clearly identified demo team records once, without
    // CLI access or accidentally onboarding staff to new restaurants.
    await ensureDemoRestaurantEmployees(
      campusRestaurants
        .filter((restaurant) =>
          restaurant.name === "Mama's Kitchen" || isSeededBazeRestaurant(restaurant)
        )
        .map(({ id }) => ({ id }))
    );
  }

  const { restaurantId: requestedRestaurantId } = await searchParams;

  let restaurantId = requestedRestaurantId;
  if (!restaurantId) {
    const defaultMembership = await prisma.restaurantStaff.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        role: { in: ["OWNER", "STAFF"] },
      },
      select: { restaurantId: true },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultMembership) redirect("/");
    restaurantId = defaultMembership.restaurantId;
  }

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
          payoutBankCode: true,
          payoutAccountName: true,
          payoutAccountNumber: true,
          payoutRecipientCode: true,
          paystackSubaccountCode: true,
          paystackSubaccountId: true,
          payoutVerifiedAt: true,
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

  if (!membership || !membership.isActive) redirect("/");
  const canManageNormally = ["OWNER", "STAFF"].includes(membership.role);
  const canManageDemoRestaurant =
    hasDemoWorkspaceAccess && isSeededBazeRestaurant(membership.restaurant);
  if (!canManageNormally && !canManageDemoRestaurant) {
    redirect("/");
  }

  const restaurantMemberships = (
    await prisma.restaurantStaff.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        restaurantId: true,
        role: true,
        restaurant: {
          select: {
            name: true,
            address: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })
  )
    .filter((entry) =>
      ["OWNER", "STAFF"].includes(entry.role) ||
      (hasDemoWorkspaceAccess && isSeededBazeRestaurant(entry.restaurant))
    )
    .sort((a, b) => a.restaurant.name.localeCompare(b.restaurant.name));

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
      membership.restaurant.payoutBankCode?.trim() &&
      membership.restaurant.payoutAccountName?.trim() &&
      membership.restaurant.payoutAccountNumber?.trim() &&
      membership.restaurant.paystackSubaccountCode?.trim() &&
      membership.restaurant.payoutVerifiedAt
  );
  const verificationSteps = [
    { label: "Restaurant Details", complete: detailsComplete },
    { label: "Add at least 1 Rider", complete: riderComplete },
    { label: "Create your menu", complete: menuComplete },
    { label: "Add your Bank Info", complete: bankComplete },
  ];

  const clerkUser = await currentUser();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "there";
  const roleLabel = canManageNormally
    ? membership.role === "OWNER" ? "Restaurant Owner" : "Restaurant Staff"
    : "Demo Management Access";
  const avatarUrl = clerkUser?.imageUrl;

  return (
    <main className="min-h-screen bg-white">
      <DashboardLiveRefresh intervalMs={12000} />
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

              <details className="group relative min-w-0 max-w-full">
                <summary className="inline-flex max-w-full cursor-pointer list-none items-center whitespace-nowrap rounded-full border-2 border-[#EAEAEA] px-2.5 py-1 text-[12px] font-normal leading-none [&::-webkit-details-marker]:hidden">
                  <span className="shrink-0 text-[#808080]">Profile</span>
                  <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-[#808080]" strokeWidth={2.65} />
                  <span className="shrink-0 text-[#808080]">
                    All Restaurants ({restaurantMemberships.length})
                  </span>
                  <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-[#808080]" strokeWidth={2.65} />
                  <span className="min-w-0 truncate font-semibold tracking-[-2%] text-black">
                    {membership.restaurant.name}
                  </span>
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0 text-[#808080] transition-transform group-open:rotate-180" strokeWidth={2.4} />
                </summary>

                <div className="absolute left-0 top-[calc(100%+8px)] z-[80] max-h-[340px] w-[290px] overflow-y-auto rounded-[14px] border border-[#E5E5E5] bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
                  <div className="px-2 pb-2 pt-1">
                    <p className="text-[10px] font-semibold text-black">Switch restaurant</p>
                    <p className="mt-0.5 text-[9px] text-[#888]">
                      You can manage all restaurants attached to this account.
                    </p>
                  </div>

                  <div className="space-y-1">
                    {restaurantMemberships.map((entry) => {
                      const selected = entry.restaurantId === restaurantId;

                      return (
                        <Link
                          key={entry.restaurantId}
                          href={`/restaurant/dashboard?restaurantId=${entry.restaurantId}`}
                          className={
                            "flex items-center gap-2 rounded-[9px] px-2.5 py-2.5 text-[11px] transition hover:bg-[#F4F4F4] " +
                            (selected ? "bg-[#F2F2F2] font-semibold" : "bg-white")
                          }
                        >
                          <Store className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                          <span className="min-w-0 flex-1 truncate">{entry.restaurant.name}</span>
                          {selected ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} /> : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </details>

              <RestaurantHoursStatus
                openingTime={membership.restaurant.openingTime}
                closingTime={membership.restaurant.closingTime}
                operatingDays={membership.restaurant.operatingDays}
                timezone={membership.restaurant.timezone}
              />

              <div className="hidden min-w-4 flex-1 xl:block" />

              <RestaurantPayoutSettingsButton
                restaurantId={restaurantId}
                bankName={membership.restaurant.payoutBankName}
                bankCode={membership.restaurant.payoutBankCode}
                accountName={membership.restaurant.payoutAccountName}
                accountNumber={membership.restaurant.payoutAccountNumber}
                payoutVerified={Boolean(
                  membership.restaurant.paystackSubaccountCode &&
                  membership.restaurant.payoutVerifiedAt
                )}
              />

              <Link
                href="/customer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#EAEAEA] px-2.5 py-1 text-[12px] font-semibold leading-none tracking-[-0.02em] text-black"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={2.3} />
                Switch to Customer
              </Link>
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
            payoutBankCode: membership.restaurant.payoutBankCode,
            payoutAccountName: membership.restaurant.payoutAccountName,
            payoutAccountNumber: membership.restaurant.payoutAccountNumber,
            payoutRecipientCode: membership.restaurant.payoutRecipientCode,
            paystackSubaccountCode: membership.restaurant.paystackSubaccountCode,
            paystackSubaccountId: membership.restaurant.paystackSubaccountId,
            payoutVerifiedAt: membership.restaurant.payoutVerifiedAt?.toISOString() ?? null,
          }}
          verificationSteps={verificationSteps}
          currentUserId={user.id}
        />

        <div className="h-[168px]" />
      </div>
    </main>
  );
}
