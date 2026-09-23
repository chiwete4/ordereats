import "server-only";

import { prisma } from "@/lib/prisma";

export async function completePaystackPayment({
  reference,
  chargedAmountKobo,
  providerFeeKobo,
  paidAt,
}: {
  reference: string;
  chargedAmountKobo: number;
  providerFeeKobo?: number | null;
  paidAt?: Date | null;
}) {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    select: {
      id: true,
      orderId: true,
      status: true,
      amount: true,
    },
  });

  if (!payment) throw new Error("Payment reference not found.");

  const expectedAmountKobo = Math.round(Number(payment.amount) * 100);
  if (!Number.isFinite(chargedAmountKobo) || chargedAmountKobo < expectedAmountKobo) {
    throw new Error("Verified payment amount is lower than the order amount.");
  }

  if (payment.status !== "SUCCESS") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          paidAt: paidAt ?? new Date(),
          chargedAmount: (chargedAmountKobo / 100).toFixed(2),
          providerFee:
            typeof providerFeeKobo === "number"
              ? (providerFeeKobo / 100).toFixed(2)
              : undefined,
        },
      }),
      prisma.restaurantOrder.updateMany({
        where: {
          orderId: payment.orderId,
          status: "PENDING_PAYMENT",
        },
        data: { status: "CONFIRMED" },
      }),
    ]);
  }

  return { orderId: payment.orderId };
}
