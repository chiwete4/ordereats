import { NextRequest, NextResponse } from "next/server";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { resolveNigerianAccount } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = (await request.json()) as {
    restaurantId?: string;
    accountNumber?: string;
    bankCode?: string;
  };

  const restaurantId = body.restaurantId?.trim();
  const accountNumber = body.accountNumber?.trim();
  const bankCode = body.bankCode?.trim();

  if (!restaurantId || !/^\d{10}$/.test(accountNumber || "") || !bankCode) {
    return NextResponse.json(
      { error: "Choose a bank and enter a valid 10-digit account number." },
      { status: 400 }
    );
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
    },
  });

  if (
    !membership ||
    !membership.isActive ||
    !["OWNER", "STAFF"].includes(membership.role)
  ) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  try {
    const account = await resolveNigerianAccount(accountNumber, bankCode);
    return NextResponse.json({
      accountNumber: account.account_number,
      accountName: account.account_name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Paystack could not verify that account.",
      },
      { status: 400 }
    );
  }
}
