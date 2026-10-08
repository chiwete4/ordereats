ALTER TABLE "MenuItem"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "FeaturedCombo" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "readyMin" INTEGER NOT NULL DEFAULT 1,
    "readyMax" INTEGER NOT NULL DEFAULT 5,
    "deliverySeconds" INTEGER NOT NULL DEFAULT 45,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeaturedCombo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeaturedComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeaturedComboItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeaturedCombo_restaurantId_sortOrder_idx"
ON "FeaturedCombo"("restaurantId", "sortOrder");

CREATE UNIQUE INDEX "FeaturedComboItem_comboId_menuItemId_key"
ON "FeaturedComboItem"("comboId", "menuItemId");

CREATE INDEX "FeaturedComboItem_menuItemId_idx"
ON "FeaturedComboItem"("menuItemId");

ALTER TABLE "FeaturedCombo"
ADD CONSTRAINT "FeaturedCombo_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeaturedComboItem"
ADD CONSTRAINT "FeaturedComboItem_comboId_fkey"
FOREIGN KEY ("comboId") REFERENCES "FeaturedCombo"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeaturedComboItem"
ADD CONSTRAINT "FeaturedComboItem_menuItemId_fkey"
FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
