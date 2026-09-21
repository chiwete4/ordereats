CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');

ALTER TABLE "Restaurant"
ADD COLUMN "payoutBankCode" TEXT,
ADD COLUMN "payoutRecipientCode" TEXT,
ADD COLUMN "payoutRecipientId" TEXT,
ADD COLUMN "payoutVerifiedAt" TIMESTAMP(3);

CREATE TABLE "RestaurantPayout" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "reference" TEXT NOT NULL,
  "paystackTransferCode" TEXT,
  "paystackTransferId" TEXT,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "RestaurantPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestaurantPayoutOrder" (
  "payoutId" TEXT NOT NULL,
  "restaurantOrderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RestaurantPayoutOrder_pkey" PRIMARY KEY ("payoutId","restaurantOrderId")
);

CREATE UNIQUE INDEX "RestaurantPayout_reference_key" ON "RestaurantPayout"("reference");
CREATE INDEX "RestaurantPayout_restaurantId_status_createdAt_idx" ON "RestaurantPayout"("restaurantId", "status", "createdAt");
CREATE UNIQUE INDEX "RestaurantPayoutOrder_restaurantOrderId_key" ON "RestaurantPayoutOrder"("restaurantOrderId");

ALTER TABLE "RestaurantPayout"
ADD CONSTRAINT "RestaurantPayout_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantPayoutOrder"
ADD CONSTRAINT "RestaurantPayoutOrder_payoutId_fkey"
FOREIGN KEY ("payoutId") REFERENCES "RestaurantPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantPayoutOrder"
ADD CONSTRAINT "RestaurantPayoutOrder_restaurantOrderId_fkey"
FOREIGN KEY ("restaurantOrderId") REFERENCES "RestaurantOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
