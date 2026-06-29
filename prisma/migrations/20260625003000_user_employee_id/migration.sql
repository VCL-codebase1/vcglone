ALTER TABLE "User" ADD COLUMN "employeeId" TEXT;
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
