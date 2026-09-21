import { NextResponse } from "next/server";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { listNigerianBanks } from "@/lib/paystack";

export async function GET() {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  try {
    const banks = await listNigerianBanks();
    return NextResponse.json({
      banks: banks.map((bank) => ({
        id: bank.id,
        name: bank.name,
        code: bank.code,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load Nigerian banks from Paystack.",
      },
      { status: 500 }
    );
  }
}
