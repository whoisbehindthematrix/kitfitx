-- CreateTable
CREATE TABLE "OnboardingData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER,
    "averageCycleLength" INTEGER NOT NULL DEFAULT 28,
    "periodDuration" INTEGER NOT NULL DEFAULT 5,
    "weightRange" TEXT,
    "heightRange" TEXT,
    "reproductiveStage" TEXT,
    "healthGoal" TEXT,
    "birthControl" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalDiagnoses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "physicalSymptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pmsMood" TEXT,
    "stressLevel" TEXT,
    "foodStruggles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietaryLifestyle" TEXT,
    "cycleLength" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingData_userId_key" ON "OnboardingData"("userId");

-- CreateIndex
CREATE INDEX "OnboardingData_userId_idx" ON "OnboardingData"("userId");

-- AddForeignKey
ALTER TABLE "OnboardingData" ADD CONSTRAINT "OnboardingData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
