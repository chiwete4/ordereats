import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getOrCreateCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Authenticated Clerk user has no email address.");
  }

  const user = await prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
      lastLoginAt: new Date(),
    },
  });

  return user;
}
