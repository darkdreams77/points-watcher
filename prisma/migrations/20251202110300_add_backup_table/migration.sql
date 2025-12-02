-- CreateTable
CREATE TABLE "MemberBackup" (
    "id" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "lastPoints" INTEGER,
    "lastScanAt" TIMESTAMP(3),
    "lastChangeAt" TIMESTAMP(3),
    "manualStatus" TEXT,
    "groupId" TEXT NOT NULL,
    "backupAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberBackup_pkey" PRIMARY KEY ("id")
);
