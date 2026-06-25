"use server";

import { AttendanceStatus, LeaveRequestStatus, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit";
import { countWorkingDays, minutesBetween, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { canAdmin, canManageAccountRole, requireRole, requireUser } from "@/lib/rbac";
import {
  approvalSchema,
  attendanceActionSchema,
  departmentSchema,
  employeeCreateSchema,
  employeeSelfProfileSchema,
  employeeSchema,
  leaveRequestSchema,
  leaveTypeSchema,
  manualAttendanceSchema,
  workPolicySchema
} from "@/lib/validators";
import { getUploadConfig, uploadLeaveAttachment } from "@/lib/storage";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formJsonArray(formData: FormData, key: string) {
  const value = formString(formData, key);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error(`Invalid ${key} data.`);
  }
}

function profileFormValues(formData: FormData) {
  return {
    dateOfBirth: formString(formData, "dateOfBirth"),
    gender: formString(formData, "gender"),
    maritalStatus: formString(formData, "maritalStatus"),
    aboutMe: formString(formData, "aboutMe"),
    expertise: formString(formData, "expertise"),
    workExperiences: formJsonArray(formData, "workExperiences"),
    educationDetails: formJsonArray(formData, "educationDetails"),
    dependents: formJsonArray(formData, "dependents")
  };
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function submitAttendanceAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = attendanceActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid attendance request." };

  const { action, latitude, longitude, accuracy, note, userAgent } = parsed.data;
  const hasLocation = latitude !== undefined && longitude !== undefined;
  if (!hasLocation && !note?.trim()) {
    return { ok: false, message: "Add a note when location is unavailable." };
  }

  const date = todayDateOnly();
  const now = new Date();
  const requiresReview = !hasLocation;
  const reviewReason = requiresReview ? "Location unavailable or permission denied." : null;

  if (action === "check-in") {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: user.id, date } }
    });
    if (existing?.checkInTime) return { ok: false, message: "You have already checked in today." };

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: user.id, date } },
      create: {
        employeeId: user.id,
        date,
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInAccuracy: accuracy,
        checkInNote: note,
        checkInUserAgent: userAgent,
        status: requiresReview ? AttendanceStatus.PENDING_REVIEW : AttendanceStatus.CHECKED_IN,
        requiresReview,
        reviewReason
      },
      update: {
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInAccuracy: accuracy,
        checkInNote: note,
        checkInUserAgent: userAgent,
        status: requiresReview ? AttendanceStatus.PENDING_REVIEW : AttendanceStatus.CHECKED_IN,
        requiresReview,
        reviewReason
      }
    });

    await createAuditLog({
      actorId: user.id,
      action: requiresReview ? "ATTENDANCE_SUBMITTED_WITHOUT_LOCATION" : "EMPLOYEE_CHECK_IN",
      entityType: "AttendanceRecord",
      entityId: record.id,
      metadata: { hasLocation, accuracy }
    });
    revalidatePath("/employee/attendance");
    return { ok: true, message: requiresReview ? "Checked in and marked pending review." : "Checked in successfully." };
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: user.id, date } }
  });
  if (!existing?.checkInTime) return { ok: false, message: "You must check in before checking out." };
  if (existing.checkOutTime) return { ok: false, message: "You have already checked out today." };

  const record = await prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      checkOutTime: now,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
      checkOutAccuracy: accuracy,
      checkOutNote: note,
      checkOutUserAgent: userAgent,
      totalMinutes: minutesBetween(existing.checkInTime, now),
      status: requiresReview || existing.requiresReview ? AttendanceStatus.PENDING_REVIEW : AttendanceStatus.CHECKED_OUT,
      requiresReview: requiresReview || existing.requiresReview,
      reviewReason: requiresReview ? "Location unavailable or permission denied at check-out." : existing.reviewReason
    }
  });

  await createAuditLog({
    actorId: user.id,
    action: requiresReview ? "ATTENDANCE_SUBMITTED_WITHOUT_LOCATION" : "EMPLOYEE_CHECK_OUT",
    entityType: "AttendanceRecord",
    entityId: record.id,
    metadata: { hasLocation, accuracy, totalMinutes: record.totalMinutes }
  });
  revalidatePath("/employee/attendance");
  return { ok: true, message: requiresReview ? "Checked out and marked pending review." : "Checked out successfully." };
}

export async function applyForLeave(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leaveRequestSchema.safeParse({
    leaveTypeId: formString(formData, "leaveTypeId"),
    startDate: formString(formData, "startDate"),
    endDate: formString(formData, "endDate"),
    reason: formString(formData, "reason")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid leave request." };

  const [leaveType, employee] = await Promise.all([
    prisma.leaveType.findUnique({ where: { id: parsed.data.leaveTypeId } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { dateJoined: true } })
  ]);
  if (!leaveType || !leaveType.active) return { ok: false, message: "Selected leave type is unavailable." };
  if (!employee?.dateJoined) return { ok: false, message: "Your joining date is missing. Ask HR to update your profile before applying." };

  const eligibleAt = addMonths(employee.dateJoined, leaveType.eligibilityMonths);
  if (new Date() < eligibleAt) {
    const label = leaveType.eligibilityMonths === 12 ? "1 year" : `${leaveType.eligibilityMonths} month${leaveType.eligibilityMonths === 1 ? "" : "s"}`;
    return { ok: false, message: `You qualify for ${leaveType.name} after ${label} of employment.` };
  }

  const totalDays = countWorkingDays(parsed.data.startDate, parsed.data.endDate);
  if (totalDays < 1) return { ok: false, message: "Leave request must include at least one working day." };

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: user.id,
      status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] },
      startDate: { lte: parsed.data.endDate },
      endDate: { gte: parsed.data.startDate }
    }
  });
  if (overlap) return { ok: false, message: "This request overlaps an existing pending or approved leave." };

  let attachmentUrl: string | undefined;
  const file = formData.get("attachment");
  const uploadConfig = getUploadConfig();
  if (file instanceof File && file.size > 0) {
    const upload = await uploadLeaveAttachment(file, user.id);
    if (!upload.ok) return { ok: false, message: upload.message };
    attachmentUrl = upload.url;
  }
  if (leaveType.requiresDocument && uploadConfig.enabled && !attachmentUrl) {
    return { ok: false, message: "This leave type requires a supporting document." };
  }

  if (leaveType.isPaid) {
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: user.id,
          leaveTypeId: leaveType.id,
          year: parsed.data.startDate.getFullYear()
        }
      }
    });
    if (!balance || balance.remainingDays < totalDays) {
      return { ok: false, message: "Insufficient leave balance. Ask HR if an override is needed." };
    }
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      leaveTypeId: leaveType.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      totalDays,
      reason: parsed.data.reason,
      attachmentUrl
    }
  });
  await createAuditLog({
    actorId: user.id,
    action: "LEAVE_REQUEST_CREATED",
    entityType: "LeaveRequest",
    entityId: request.id,
    metadata: { totalDays, leaveType: leaveType.name }
  });
  revalidatePath("/employee/leave");
  return { ok: true, message: "Leave request submitted for approval." };
}

export async function decideLeaveRequest(formData: FormData) {
  const actor = await requireRole([Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = approvalSchema.safeParse({
    requestId: formString(formData, "requestId"),
    decision: formString(formData, "decision"),
    comment: formString(formData, "comment")
  });
  if (!parsed.success) throw new Error("Invalid approval request.");

  const request = await prisma.leaveRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: { employee: true, leaveType: true }
  });
  if (!request || request.status !== LeaveRequestStatus.PENDING) throw new Error("Leave request is not pending.");
  if (actor.role === Role.MANAGER && request.employee.managerId !== actor.id) throw new Error("Only the assigned manager can decide this request.");

  if (parsed.data.decision === "reject") {
    const updated = await prisma.leaveRequest.update({
      where: { id: request.id },
      data: {
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: parsed.data.comment || "Rejected",
        managerApproverId: actor.role === Role.MANAGER ? actor.id : request.managerApproverId,
        hrApproverId: canAdmin(actor.role) ? actor.id : request.hrApproverId,
        rejectedAt: new Date()
      }
    });
    await createAuditLog({
      actorId: actor.id,
      action: "LEAVE_REJECTED",
      entityType: "LeaveRequest",
      entityId: updated.id,
      metadata: { reason: updated.rejectionReason }
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: LeaveRequestStatus.APPROVED,
          approvalComment: parsed.data.comment,
          managerApproverId: actor.role === Role.MANAGER ? actor.id : request.managerApproverId,
          hrApproverId: canAdmin(actor.role) ? actor.id : request.hrApproverId,
          approvedAt: new Date()
        }
      });
      if (request.leaveType.isPaid) {
        await tx.leaveBalance.update({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year: request.startDate.getFullYear()
            }
          },
          data: {
            usedDays: { increment: request.totalDays },
            remainingDays: { decrement: request.totalDays }
          }
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LEAVE_APPROVED",
          entityType: "LeaveRequest",
          entityId: updated.id,
          metadata: { totalDays: request.totalDays }
        }
      });
    });
  }

  revalidatePath("/manager/leave-approvals");
  revalidatePath("/admin/leave-requests");
}

export async function manuallyAdjustAttendance(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = manualAttendanceSchema.parse({
    recordId: formString(formData, "recordId"),
    status: formString(formData, "status"),
    reason: formString(formData, "reason")
  });
  const updated = await prisma.attendanceRecord.update({
    where: { id: parsed.recordId },
    data: {
      status: parsed.status,
      requiresReview: false,
      manuallyAdjusted: true,
      adjustedById: actor.id,
      adjustmentReason: parsed.reason
    }
  });
  await createAuditLog({
    actorId: actor.id,
    action: "ATTENDANCE_MANUALLY_ADJUSTED",
    entityType: "AttendanceRecord",
    entityId: updated.id,
    metadata: { status: parsed.status, reason: parsed.reason }
  });
  revalidatePath("/admin/attendance");
  revalidatePath(`/admin/attendance/${updated.id}`);
}

export async function createEmployee(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = employeeCreateSchema.parse({
    firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    password: formString(formData, "password"),
    role: formString(formData, "role"),
    departmentId: formString(formData, "departmentId"),
    managerId: formString(formData, "managerId"),
    secondaryManagerId: formString(formData, "secondaryManagerId"),
    employmentStatus: formString(formData, "employmentStatus"),
    jobTitle: formString(formData, "jobTitle"),
    dateJoined: formString(formData, "dateJoined"),
    ...profileFormValues(formData)
  });
  if (!canManageAccountRole(actor.role, parsed.role)) {
    throw new Error("You do not have permission to create an account with this role.");
  }

  const passwordHash = await hash(parsed.password, 12);
  const { password: _password, workExperiences, educationDetails, dependents, ...employeeData } = parsed;
  const employee = await prisma.user.create({
    data: {
      ...employeeData,
      passwordHash,
      departmentId: parsed.departmentId || null,
      managerId: parsed.managerId || null,
      secondaryManagerId: parsed.secondaryManagerId || null,
      dateOfBirth: parsed.dateOfBirth || null,
      gender: parsed.gender || null,
      maritalStatus: parsed.maritalStatus || null,
      workExperiences: { create: workExperiences },
      educationDetails: { create: educationDetails },
      dependents: { create: dependents }
    }
  });

  const leaveTypes = await prisma.leaveType.findMany({ where: { active: true } });
  await prisma.leaveBalance.createMany({
    data: leaveTypes.map((type) => ({
      employeeId: employee.id,
      leaveTypeId: type.id,
      year: new Date().getFullYear(),
      entitlementDays: type.annualEntitlementDays,
      usedDays: 0,
      remainingDays: type.annualEntitlementDays
    })),
    skipDuplicates: true
  });

  await createAuditLog({
    actorId: actor.id,
    action: "EMPLOYEE_CREATED",
    entityType: "User",
    entityId: employee.id,
    metadata: { email: employee.email, role: employee.role }
  });
  redirect("/admin/employees");
}

export async function updateEmployee(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const id = formString(formData, "id");
  if (!id) throw new Error("Missing employee id.");
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) throw new Error("Employee not found.");
  if (!canManageAccountRole(actor.role, target.role)) {
    throw new Error("You do not have permission to manage this account.");
  }
  const parsed = employeeSchema.omit({ password: true }).parse({
    firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    role: formString(formData, "role"),
    departmentId: formString(formData, "departmentId"),
    managerId: formString(formData, "managerId"),
    secondaryManagerId: formString(formData, "secondaryManagerId"),
    employmentStatus: formString(formData, "employmentStatus"),
    jobTitle: formString(formData, "jobTitle"),
    dateJoined: formString(formData, "dateJoined"),
    ...profileFormValues(formData)
  });
  if (!canManageAccountRole(actor.role, parsed.role)) {
    throw new Error("You do not have permission to assign this role.");
  }
  const { workExperiences, educationDetails, dependents, ...employeeData } = parsed;
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...employeeData,
      departmentId: parsed.departmentId || null,
      managerId: parsed.managerId || null,
      secondaryManagerId: parsed.secondaryManagerId || null,
      dateJoined: parsed.dateJoined || null,
      dateOfBirth: parsed.dateOfBirth || null,
      gender: parsed.gender || null,
      maritalStatus: parsed.maritalStatus || null,
      workExperiences: { deleteMany: {}, create: workExperiences },
      educationDetails: { deleteMany: {}, create: educationDetails },
      dependents: { deleteMany: {}, create: dependents }
    }
  });
  await createAuditLog({
    actorId: actor.id,
    action: updated.employmentStatus === "INACTIVE" ? "EMPLOYEE_DEACTIVATED" : "EMPLOYEE_UPDATED",
    entityType: "User",
    entityId: updated.id,
    metadata: { role: updated.role, employmentStatus: updated.employmentStatus }
  });
  revalidatePath(`/admin/employees/${id}`);
}

export async function updateOwnProfile(formData: FormData) {
  const actor = await requireUser();
  const parsed = employeeSelfProfileSchema.parse({
    firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"),
    phone: formString(formData, "phone"),
    ...profileFormValues(formData)
  });
  const { workExperiences, educationDetails, dependents, ...profile } = parsed;

  await prisma.user.update({
    where: { id: actor.id },
    data: {
      ...profile,
      phone: profile.phone || null,
      dateOfBirth: profile.dateOfBirth || null,
      gender: profile.gender || null,
      maritalStatus: profile.maritalStatus || null,
      aboutMe: profile.aboutMe || null,
      expertise: profile.expertise || null,
      workExperiences: { deleteMany: {}, create: workExperiences },
      educationDetails: { deleteMany: {}, create: educationDetails },
      dependents: { deleteMany: {}, create: dependents }
    }
  });
  await createAuditLog({
    actorId: actor.id,
    action: "EMPLOYEE_PROFILE_UPDATED",
    entityType: "User",
    entityId: actor.id,
    metadata: {
      workExperienceCount: workExperiences.length,
      educationCount: educationDetails.length,
      dependentCount: dependents.length
    }
  });
  revalidatePath("/employee/profile");
}

export async function createDepartment(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = departmentSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    managerId: formString(formData, "managerId")
  });
  await prisma.department.create({
    data: { ...parsed, managerId: parsed.managerId || null }
  });
  await createAuditLog({ actorId: actor.id, action: "DEPARTMENT_CREATED", entityType: "Department", metadata: parsed });
  revalidatePath("/admin/departments");
}

export async function createLeaveType(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = leaveTypeSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    annualEntitlementDays: formString(formData, "annualEntitlementDays"),
    eligibilityMonths: formString(formData, "eligibilityMonths"),
    requiresDocument: formData.has("requiresDocument"),
    requiresApproval: !formData.has("requiresApproval") ? true : formData.has("requiresApproval"),
    isPaid: formData.has("isPaid"),
    active: formData.has("active")
  });
  const type = await prisma.leaveType.create({ data: parsed });
  await createAuditLog({
    actorId: actor.id,
    action: "LEAVE_TYPE_CREATED",
    entityType: "LeaveType",
    entityId: type.id,
    metadata: { name: type.name }
  });
  revalidatePath("/admin/leave-types");
}

export async function updateWorkPolicy(formData: FormData) {
  const actor = await requireRole([Role.SUPER_ADMIN]);
  const parsed = workPolicySchema.parse({
    workStartTime: formString(formData, "workStartTime"),
    workEndTime: formString(formData, "workEndTime"),
    gracePeriodMinutes: formString(formData, "gracePeriodMinutes"),
    timezone: formString(formData, "timezone"),
    workingDays: formData.getAll("workingDays").map(String)
  });
  const existing = await prisma.workPolicy.findFirst();
  const policy = existing
    ? await prisma.workPolicy.update({ where: { id: existing.id }, data: parsed })
    : await prisma.workPolicy.create({ data: parsed });
  await createAuditLog({
    actorId: actor.id,
    action: "WORK_POLICY_CHANGED",
    entityType: "WorkPolicy",
    entityId: policy.id,
    metadata: parsed
  });
  revalidatePath("/admin/settings");
}
