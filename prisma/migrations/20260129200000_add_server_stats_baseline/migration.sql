-- CreateTable
CREATE TABLE "ServerStatsBaseline" (
    "id" TEXT NOT NULL,
    "serverConfigId" TEXT NOT NULL,
    "ownerUpn" TEXT NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "licensedCount" INTEGER NOT NULL,
    "statsJson" JSONB NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerStatsBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServerStatsBaseline_serverConfigId_ownerUpn_key" ON "ServerStatsBaseline"("serverConfigId", "ownerUpn");

-- CreateIndex
CREATE INDEX "ServerStatsBaseline_ownerUpn_idx" ON "ServerStatsBaseline"("ownerUpn");
