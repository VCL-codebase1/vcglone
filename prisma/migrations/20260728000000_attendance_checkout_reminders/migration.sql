ALTER TABLE "AttendanceRecord"
ADD COLUMN "checkOutReminderSentAt" TIMESTAMP(3);

ALTER TABLE "WorkPolicy"
ADD COLUMN "checkOutReminderEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "AttendanceRecord_date_checkOutTime_checkOutReminderSentAt_idx"
ON "AttendanceRecord"("date", "checkOutTime", "checkOutReminderSentAt");
