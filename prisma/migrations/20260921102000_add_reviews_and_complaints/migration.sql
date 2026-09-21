CREATE TYPE "ReviewTarget" AS ENUM ('RESTAURANT', 'MENU_ITEM', 'FEATURED_COMBO');
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "restaurantOrderId" TEXT,
  "target" "ReviewTarget" NOT NULL,
  "menuItemId" TEXT,
  "featuredComboId" TEXT,
  "rating" INTEGER NOT NULL,
  "body" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerComplaint" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "restaurantOrderId" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerComplaint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Review_restaurantId_target_createdAt_idx" ON "Review"("restaurantId", "target", "createdAt");
CREATE INDEX "Review_menuItemId_idx" ON "Review"("menuItemId");
CREATE INDEX "Review_featuredComboId_idx" ON "Review"("featuredComboId");
CREATE INDEX "CustomerComplaint_restaurantId_status_createdAt_idx" ON "CustomerComplaint"("restaurantId", "status", "createdAt");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Review_restaurantOrderId_fkey" FOREIGN KEY ("restaurantOrderId") REFERENCES "RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Review_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Review_featuredComboId_fkey" FOREIGN KEY ("featuredComboId") REFERENCES "FeaturedCombo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerComplaint"
ADD CONSTRAINT "CustomerComplaint_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "CustomerComplaint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "CustomerComplaint_restaurantOrderId_fkey" FOREIGN KEY ("restaurantOrderId") REFERENCES "RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
