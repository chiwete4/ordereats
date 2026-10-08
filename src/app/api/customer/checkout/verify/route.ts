import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { completePaystackPayment } from "@/lib/complete-paystack-payment";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference")?.trim();
  if (!reference) {
    return NextResponse.redirect(new URL("/customer?payment=failed", request.url));
  }

  try {
    const verified = await verifyPaystackTransaction(reference);

    if (
      verified.reference !== reference ||
      verified.status !== "success" ||
      (verified.currency && verified.currency !== "NGN")
    ) {
      return NextResponse.redirect(
        new URL("/customer?payment=failed", request.url)
      );
    }

    await completePaystackPayment({
      reference,
      chargedAmountKobo: verified.amount,
      providerFeeKobo: verified.fees,
      paidAt: verified.paid_at ? new Date(verified.paid_at) : new Date(),
    });

    revalidatePath("/customer");
    revalidatePath("/restaurant/dashboard");

    return NextResponse.redirect(
      new URL(
        `/customer?payment=success&reference=${encodeURIComponent(reference)}`,
        request.url
      )
    );
  } catch {
    return NextResponse.redirect(new URL("/customer?payment=failed", request.url));
  }
}
