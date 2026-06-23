CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'SEPARATED', 'DIVORCED', 'WIDOWED', 'PREFER_NOT_TO_SAY');

ALTER TABLE "User"
  ADD COLUMN "secondaryManagerId" TEXT,
  ADD COLUMN "dateOfBirth" DATE,
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "maritalStatus" "MaritalStatus",
  ADD COLUMN "aboutMe" TEXT,
  ADD COLUMN "expertise" TEXT;

CREATE TABLE "WorkExperience" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "fromDate" DATE NOT NULL,
  "toDate" DATE,
  "jobDescription" TEXT,
  "relevant" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EducationDetail" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "instituteName" TEXT NOT NULL,
  "degree" TEXT NOT NULL,
  "specialization" TEXT,
  "completionDate" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EducationDetail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dependent" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "dateOfBirth" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dependent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_secondaryManagerId_idx" ON "User"("secondaryManagerId");
CREATE INDEX "WorkExperience_employeeId_idx" ON "WorkExperience"("employeeId");
CREATE INDEX "EducationDetail_employeeId_idx" ON "EducationDetail"("employeeId");
CREATE INDEX "Dependent_employeeId_idx" ON "Dependent"("employeeId");

ALTER TABLE "User" ADD CONSTRAINT "User_secondaryManagerId_fkey" FOREIGN KEY ("secondaryManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationDetail" ADD CONSTRAINT "EducationDetail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dependent" ADD CONSTRAINT "Dependent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
