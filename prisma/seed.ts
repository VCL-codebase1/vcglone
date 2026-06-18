import type { Role as RoleType } from "@prisma/client";
import { existsSync, readFileSync } from "fs";

function loadLocalEnv() {
  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1]?.trim();
    const rawValue = match[2]?.trim() ?? "";
    if (!key || process.env[key]) continue;
    process.env[key] = rawValue.replace(/^"|"$/g, "");
  }
}

loadLocalEnv();

const { AttendanceStatus, Role } = require("@prisma/client");
const { hash } = require("bcryptjs");
const { prisma } = require("../lib/prisma");

async function upsertUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  role: RoleType;
  departmentId?: string;
  managerId?: string;
  jobTitle: string;
}) {
  const passwordHash = await hash("Password123!", 12);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      departmentId: input.departmentId,
      managerId: input.managerId,
      jobTitle: input.jobTitle,
      employmentStatus: "ACTIVE"
    },
    create: {
      ...input,
      passwordHash,
      dateJoined: new Date("2024-01-15"),
      employmentStatus: "ACTIVE"
    }
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.warn("Refusing to seed while NODE_ENV=production. Create production users through a controlled admin process.");
    return;
  }

  const operations = await prisma.department.upsert({
    where: { name: "Operations" },
    update: {},
    create: { name: "Operations", description: "Field and operational teams" }
  });
  const people = await prisma.department.upsert({
    where: { name: "People" },
    update: {},
    create: { name: "People", description: "Human resources and workforce administration" }
  });
  const engineering = await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", description: "Internal systems and platform delivery" }
  });

  const superAdmin = await upsertUser({
    firstName: "Ada",
    lastName: "Okafor",
    email: "superadmin@workforceops.local",
    role: Role.SUPER_ADMIN,
    departmentId: people.id,
    jobTitle: "Head of Systems"
  });
  const hrAdmin = await upsertUser({
    firstName: "Maya",
    lastName: "Mensah",
    email: "hr@workforceops.local",
    role: Role.HR_ADMIN,
    departmentId: people.id,
    managerId: superAdmin.id,
    jobTitle: "HR Administrator"
  });
  const manager = await upsertUser({
    firstName: "Tunde",
    lastName: "Bello",
    email: "manager@workforceops.local",
    role: Role.MANAGER,
    departmentId: operations.id,
    managerId: hrAdmin.id,
    jobTitle: "Operations Manager"
  });
  const employee = await upsertUser({
    firstName: "Chika",
    lastName: "Nwosu",
    email: "employee@workforceops.local",
    role: Role.EMPLOYEE,
    departmentId: operations.id,
    managerId: manager.id,
    jobTitle: "Site Coordinator"
  });
  const engineer = await upsertUser({
    firstName: "Ife",
    lastName: "Adebayo",
    email: "engineer@workforceops.local",
    role: Role.EMPLOYEE,
    departmentId: engineering.id,
    managerId: manager.id,
    jobTitle: "Systems Analyst"
  });

  await prisma.department.update({ where: { id: operations.id }, data: { managerId: manager.id } });
  await prisma.department.update({ where: { id: people.id }, data: { managerId: hrAdmin.id } });

  const leaveTypes = [
    ["Annual Leave", 20, false, true],
    ["Sick Leave", 10, true, true],
    ["Casual Leave", 5, false, true],
    ["Maternity Leave", 90, true, true],
    ["Paternity Leave", 14, true, true],
    ["Compassionate Leave", 5, false, true],
    ["Study Leave", 10, true, true],
    ["Unpaid Leave", 0, false, false],
    ["Other", 0, false, true]
  ] as const;

  const createdTypes = [];
  for (const [name, days, requiresDocument, isPaid] of leaveTypes) {
    createdTypes.push(
      await prisma.leaveType.upsert({
        where: { name },
        update: { annualEntitlementDays: days, requiresDocument, isPaid, active: true },
        create: {
          name,
          description: `${name} entitlement`,
          annualEntitlementDays: days,
          requiresDocument,
          requiresApproval: true,
          isPaid,
          active: true
        }
      })
    );
  }

  const year = new Date().getFullYear();
  for (const user of [superAdmin, hrAdmin, manager, employee, engineer]) {
    for (const leaveType of createdTypes) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: user.id, leaveTypeId: leaveType.id, year } },
        update: {},
        create: {
          employeeId: user.id,
          leaveTypeId: leaveType.id,
          year,
          entitlementDays: leaveType.annualEntitlementDays,
          usedDays: 0,
          remainingDays: leaveType.annualEntitlementDays
        }
      });
    }
  }

  await prisma.workPolicy.upsert({
    where: { id: "default-work-policy" },
    update: {
      workStartTime: "09:00",
      workEndTime: "17:00",
      gracePeriodMinutes: 15,
      timezone: "Africa/Lagos",
      workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    },
    create: {
      id: "default-work-policy",
      workStartTime: "09:00",
      workEndTime: "17:00",
      gracePeriodMinutes: 15,
      timezone: "Africa/Lagos",
      workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    update: {},
    create: {
      employeeId: employee.id,
      date: today,
      checkInTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      checkInLatitude: 6.5244,
      checkInLongitude: 3.3792,
      checkInAccuracy: 18,
      checkInUserAgent: "Seeded browser",
      status: AttendanceStatus.CHECKED_IN
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: "SEED_DATA_CREATED",
      entityType: "System",
      metadata: { users: 5, leaveTypes: createdTypes.length }
    }
  });

  console.log("Seed complete.");
  console.log("Demo password for all accounts: Password123!");
  console.log("superadmin@workforceops.local, hr@workforceops.local, manager@workforceops.local, employee@workforceops.local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
