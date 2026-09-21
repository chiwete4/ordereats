import "server-only";

import crypto from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

type PaystackEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackBank = {
  id: number;
  name: string;
  code: string;
  slug?: string;
  type?: string;
  currency?: string;
  active?: boolean;
  is_deleted?: boolean;
  country?: string;
};

export type PaystackResolvedAccount = {
  account_number: string;
  account_name: string;
  bank_id?: number;
};

export type PaystackTransferRecipient = {
  id: number;
  recipient_code: string;
  name: string;
  active: boolean;
  currency: string;
  type: string;
  details?: {
    account_number?: string;
    account_name?: string | null;
    bank_code?: string;
    bank_name?: string;
  };
};

export type PaystackTransfer = {
  id: number;
  amount: number;
  currency: string;
  reference: string;
  transfer_code?: string;
  status: string;
  recipient?: string | PaystackTransferRecipient;
};

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "Paystack is not configured. Add PAYSTACK_SECRET_KEY to your environment."
    );
  }
  return key;
}

async function paystackFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<PaystackEnvelope<T>> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as
    | PaystackEnvelope<T>
    | { status?: boolean; message?: string };

  if (!response.ok || !payload.status || !("data" in payload)) {
    throw new Error(payload.message || "Paystack could not complete that request.");
  }

  return payload as PaystackEnvelope<T>;
}

export async function listNigerianBanks() {
  const response = await paystackFetch<PaystackBank[]>(
    "/bank?country=nigeria&currency=NGN&perPage=100"
  );

  return response.data
    .filter((bank) => bank.active !== false && bank.is_deleted !== true)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveNigerianAccount(
  accountNumber: string,
  bankCode: string
) {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode,
  });
  const response = await paystackFetch<PaystackResolvedAccount>(
    `/bank/resolve?${params.toString()}`
  );
  return response.data;
}

export async function createNigerianTransferRecipient({
  name,
  accountNumber,
  bankCode,
  restaurantId,
}: {
  name: string;
  accountNumber: string;
  bankCode: string;
  restaurantId: string;
}) {
  const response = await paystackFetch<PaystackTransferRecipient>(
    "/transferrecipient",
    {
      method: "POST",
      body: JSON.stringify({
        type: "nuban",
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
        metadata: {
          restaurantId,
          product: "paperbag",
        },
      }),
    }
  );
  return response.data;
}

export async function verifyPaystackTransfer(reference: string) {
  const response = await paystackFetch<PaystackTransfer>(
    `/transfer/verify/${encodeURIComponent(reference)}`
  );
  return response.data;
}

export async function initiatePaystackTransfer({
  amountKobo,
  recipientCode,
  reference,
  reason,
}: {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason: string;
}) {
  const response = await paystackFetch<PaystackTransfer>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reference,
      reason,
      currency: "NGN",
    }),
  });
  return response.data;
}

export function verifyPaystackWebhook(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}
