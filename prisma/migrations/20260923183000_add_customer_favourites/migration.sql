CREATE TABLE "FavoriteRestaurant" (
  "userId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FavoriteRestaurant_pkey" PRIMARY KEY ("userId","restaurantId")
);

CREATE INDEX "FavoriteRestaurant_restaurantId_createdAt_idx"
ON "FavoriteRestaurant"("restaurantId", "createdAt");

ALTER TABLE "FavoriteRestaurant"
ADD CONSTRAINT "FavoriteRestaurant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FavoriteRestaurant"
ADD CONSTRAINT "FavoriteRestaurant_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
