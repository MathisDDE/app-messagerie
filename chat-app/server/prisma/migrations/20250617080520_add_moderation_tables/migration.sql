-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SPAM', 'PHISHING', 'MALICIOUS_LINK', 'INAPPROPRIATE', 'HARASSMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('ANALYZED', 'BLOCKED', 'WARNED', 'ALLOWED', 'REPORTED');

-- CreateTable
CREATE TABLE "MessageReport" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "reportReason" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "aiAnalysis" JSONB,
    "riskScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "analysis" JSONB NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "warned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);
