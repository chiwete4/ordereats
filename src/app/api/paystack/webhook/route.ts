import { NextRequest, NextResponse } from "next/server";

import { completePaystackPayment } from "@/lib/complete-paystack-payment";
import { verifyPaystackWebhook } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

type PaystackWebhook = {
  event?: string;
  data?: {
    reference?: string;
    transfer_code?: string;
    id?: number | string;
    status?: string;
    paid_at?: string | null;
    amount?: number;
    fees?: number | null;
    failures?: unknown;
    reason?: string | null;
  };
};

function failureMessage(data: PaystackWebhook["data"]) {
  if (!data) return null;
  if (typeof data.reason === "string" && data.reason) return data.reason;
  if (typeof data.failures === "string" && data.failures) return data.failures;
  if (data.failures) {
    const serialized = JSON.stringify(data.failures);
    return serialized ? serialized.slice(0, 1000) : null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Paystack signature." }, { status: 401 });
  }

  let event: PaystackWebhook;
  try {
    event = JSON.parse(rawBody) as PaystackWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ received: true });
  }

  if (event.event === "charge.success") {
    if (typeof event.data?.amount === "number") {
      try {
        await completePaystackPayment({
          reference,
          chargedAmountKobo: event.data.amount,
          providerFeeKobo:
            typeof event.data.fees === "number" ? event.data.fees : undefined,
          paidAt: event.data.paid_at ? new Date(event.data.paid_at) : new Date(),
        });
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "Payment reference not found."
        ) {
          throw error;
        }
      }
    }

    return NextResponse.json({ received: true });
  }

  if (
    event.event === "transfer.success" ||
    event.event === "transfer.failed" ||
    event.event === "transfer.reversed"
  ) {
    const status =
      event.event === "transfer.success"
        ? "SUCCESS"
        : event.event === "transfer.reversed"
          ? "REVERSED"
          : "FAILED";

    const payout = await prisma.restaurantPayout.findUnique({
      where: { reference },
      select: { id: true },
    });

    if (payout) {
      await prisma.$transaction(async (tx) => {
        await tx.restaurantPayout.update({
          where: { id: payout.id },
          data: {
            status,
            paystackTransferCode: event.data?.transfer_code || undefined,
            paystackTransferId:
              event.data?.id === undefined ? undefined : String(event.data.id),
            completedAt: status === "SUCCESS" ? new Date() : null,
            failureReason: status === "SUCCESS" ? null : failureMessage(event.data),
          },
        });

        if (status === "FAILED" || status === "REVERSED") {
          await tx.restaurantPayoutOrder.deleteMany({
            where: { payoutId: payout.id },
          });
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
