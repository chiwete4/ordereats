import { NextRequest, NextResponse } from "next/server";

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
    await prisma.payment.updateMany({
      where: { reference },
      data: {
        status: "SUCCESS",
        paidAt: event.data?.paid_at ? new Date(event.data.paid_at) : new Date(),
      },
    });
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

    await prisma.restaurantPayout.updateMany({
      where: { reference },
      data: {
        status,
        paystackTransferCode: event.data?.transfer_code || undefined,
        paystackTransferId:
          event.data?.id === undefined ? undefined : String(event.data.id),
        completedAt: status === "SUCCESS" ? new Date() : null,
        failureReason: status === "SUCCESS" ? null : failureMessage(event.data),
      },
    });
  }

  return NextResponse.json({ received: true });
}
