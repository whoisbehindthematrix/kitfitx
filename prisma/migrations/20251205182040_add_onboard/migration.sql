/*
  Warnings:

  - You are about to drop the `OnboardingData` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."OnboardingData" DROP CONSTRAINT "OnboardingData_userId_fkey";

-- DropTable
DROP TABLE "public"."OnboardingData";

-- CreateTable
CREATE TABLE "Onboarding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "targetWeight" DOUBLE PRECISION,
    "unitsSystem" TEXT,
    "dailyCalorieGoal" INTEGER,
    "averageCycleLength" INTEGER NOT NULL DEFAULT 28,
    "periodDuration" INTEGER NOT NULL DEFAULT 5,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingQuestions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reproductiveStage" TEXT,
    "healthGoal" TEXT,
    "birthControl" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalDiagnoses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "physicalSymptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pmsMood" TEXT,
    "stressLevel" TEXT,
    "foodStruggles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietaryLifestyle" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingQuestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Onboarding_userId_key" ON "Onboarding"("userId");

-- CreateIndex
CREATE INDEX "Onboarding_userId_idx" ON "Onboarding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingQuestions_userId_key" ON "OnboardingQuestions"("userId");

-- CreateIndex
CREATE INDEX "OnboardingQuestions_userId_idx" ON "OnboardingQuestions"("userId");

-- AddForeignKey
ALTER TABLE "Onboarding" ADD CONSTRAINT "Onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingQuestions" ADD CONSTRAINT "OnboardingQuestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
