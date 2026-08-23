-- CreateTable
CREATE TABLE "CloudBackup" (
    "address" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudBackup_pkey" PRIMARY KEY ("address")
);
