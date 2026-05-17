/*
  Warnings:

  - You are about to drop the column `avatarUrl` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" DATETIME,
    "name" TEXT,
    "image" TEXT,
    "cityName" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "radiusKm" INTEGER NOT NULL DEFAULT 50,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationFrequency" TEXT NOT NULL DEFAULT 'DAILY_DIGEST',
    "lastArtistSyncAt" DATETIME,
    "lastConcertSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("cityName", "createdAt", "email", "id", "lastArtistSyncAt", "lastConcertSyncAt", "latitude", "longitude", "name", "notificationFrequency", "notificationsEnabled", "radiusKm", "spotifyId") SELECT "cityName", "createdAt", "email", "id", "lastArtistSyncAt", "lastConcertSyncAt", "latitude", "longitude", "name", "notificationFrequency", "notificationsEnabled", "radiusKm", "spotifyId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
