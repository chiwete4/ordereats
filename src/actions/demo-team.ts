"use server";

import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isSeededBazeRestaurant } from "@/lib/demo-restaurant-access";
import { demoEmail, demoPersona, demoUserId } from "@/lib/demo-restaurant-employees";

export type DemoTeamCredential = {
  restaurant: string;
  name: string;
  role: "STAFF" | "RIDER";
  email: string;
  password: string;
};

export type DemoTeamActivationResult = {
  accounts: DemoTeamCredential[];
  errors: string[];
};

// This operation creates sign-in identities, and is deliberately restricted
// to the project demonstrator and the existing Mama's Kitchen management role.
// Ordinary owners/staff cannot create arbitrary Clerk users.
async function requireDemoAdministrator() {
  const user = await getOrCreateCurrentUser();
  if (!user || user.email.toLowerCase() !== "mathew.ou@icloud.com") {
    throw new Error("Demo account setup is restricted to the project demonstrator.");
  }

  const workspaceMembership = await prisma.restaurantStaff.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      role: { in: ["OWNER", "STAFF"] },
      restaurant: { name: "Mama's Kitchen" },
    },
    select: { id: true },
  });

  if (!workspaceMembership) {
    throw new Error("You need active Mama's Kitchen management access.");
  }
}

export async function activateDemoRestaurantTeam(
  restaurantId: string
): Promise<DemoTeamActivationResult> {
  await requireDemoAdministrator();

  const eligible = (
    await prisma.restaurant.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, name: true, address: true, isVerified: true },
    })
  ).filter((restaurant) =>
    restaurant.name === "Mama's Kitchen" || isSeededBazeRestaurant(restaurant)
  );
  const index = eligible.findIndex((restaurant) => restaurant.id === restaurantId);
  if (index === -1) {
    throw new Error("Only seeded demonstration restaurants can have demo accounts activated.");
  }

  const restaurant = eligible[index];
  const accounts: DemoTeamCredential[] = [];
  const errors: string[] = [];
  const client = await clerkClient();

  for (let slot = 1; slot <= 4; slot++) {
    const userId = demoUserId(restaurantId, slot);
    const membership = await prisma.restaurantStaff.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
      include: { user: true },
    });

    if (!membership || !membership.user.id.startsWith("paperbag_demo_user_")) {
      errors.push(`Account ${slot} hasn't been seeded yet. Refresh the dashboard and retry.`);
      continue;
    }

    const { firstName, lastName } = demoPersona(index, slot);
    const name = firstName + " " + lastName;
    const email = demoEmail(restaurantId, slot);
    const password = "Pb!" + randomBytes(18).toString("base64url") + "7z";
    const metadata = {
      seededBy: "paperbag-demo",
      restaurantId,
      slot,
      demoRole: membership.role,
    };

    try {
      let clerkId = membership.user.clerkId;

      if (clerkId.startsWith("paperbag_demo_clerk_")) {
        // Retrying an interrupted request may find a Clerk user that was
        // created successfully before the database was updated.
        const matches = await client.users.getUserList({ emailAddress: [email], limit: 1 });
        const existing = matches.data[0];
        if (existing) {
          if (
            existing.publicMetadata?.seededBy !== "paperbag-demo" ||
            existing.publicMetadata?.restaurantId !== restaurantId ||
            existing.publicMetadata?.slot !== slot
          ) {
            throw new Error("Email already belongs to a different Clerk account.");
          }
          clerkId = existing.id;
          await client.users.updateUser(clerkId, {
            firstName, lastName, password, signOutOfOtherSessions: true,
          });
        } else {
          const created = await client.users.createUser({
            emailAddress: [email],
            firstName,
            lastName,
            password,
            publicMetadata: metadata,
          });
          clerkId = created.id;
        }
      } else {
        // Only rotate passwords on our OWN seeded demo accounts, never on a
        // real person's account or a manually added employee.
        const existing = await client.users.getUser(clerkId);
        if (
          existing.publicMetadata?.seededBy !== "paperbag-demo" ||
          existing.publicMetadata?.restaurantId !== restaurantId ||
          existing.publicMetadata?.slot !== slot
        ) {
          throw new Error("Refusing to modify an account that isn't a Paperbag demo account.");
        }
        await client.users.updateUser(clerkId, {
          firstName, lastName, password, signOutOfOtherSessions: true,
        });
      }

      await prisma.user.update({
        where: { id: membership.userId },
        data: { clerkId, email, firstName, lastName },
      });

      accounts.push({ restaurant: restaurant.name, name, role: membership.role as "STAFF" | "RIDER", email, password });
    } catch (error) {
      // The server never logs passwords; expose only an operational error to
      // the authenticated demo admin. Each slot can be retried independently.
      const detail = error instanceof Error ? error.message : "Unknown Clerk error";
      errors.push(`${name}: ${detail.slice(0, 240)}`);
    }
  }

  revalidatePath("/restaurant/dashboard");
  revalidatePath("/rider");
  return { accounts, errors };
}
