-- CreateTable
CREATE TABLE "ServerConfig" (
    "id" TEXT NOT NULL,
    "ownerUpn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "pwdCipher" TEXT NOT NULL,
    "pwdIv" TEXT NOT NULL,
    "pwdTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerConfig_ownerUpn_idx" ON "ServerConfig"("ownerUpn");
