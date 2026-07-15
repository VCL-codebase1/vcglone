"use server";

import { AttendanceStatus, LeaveRequestStatus, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit";
import { countWorkingDays, minutesBetween, todayDateOnly } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";
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
  passwordResetSchema,
  workPolicySchema
} from "@/lib/validators";

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

function validationErrorMessage(error: { issues: { path: (string | number)[]; message: string }[] }, fallback: string) {
  const issue = error.issues[0];
  if (!issue) return fallback;
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
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

function selfServiceLeaveHref(role: Role) {
  if (role === Role.HR_ADMIN) return "/admin/my-leave";
  if (role === Role.MANAGER) return "/manager/my-leave";
  return "/employee/leave";
}

function selfServiceProfileHref(role: Role) {
  if (role === Role.HR_ADMIN) return "/admin/profile";
  if (role === Role.MANAGER) return "/manager/profile";
  return "/employee/profile";
}

function selfServiceDashboardHref(role: Role) {
  if (role === Role.HR_ADMIN) return "/admin/dashboard";
  if (role === Role.MANAGER) return "/manager/dashboard";
  return "/employee/dashboard";
}

function tracksLeaveBalance(leaveType: { annualEntitlementDays: number }) {
  return leaveType.annualEntitlementDays > 0;
}

async function notifyActionCompleted(userId: string, title: string, message: string, href?: string) {
  await createNotification({ userId, title, message, href });
}

export async function submitAttendanceAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === Role.SUPER_ADMIN) return { ok: false, message: "Super Admin accounts do not use attendance check-in." };
  const parsed = attendanceActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid attendance request." };

  const { action, latitude, longitude, accuracy, placeName, note, userAgent } = parsed.data;
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
        checkInPlaceName: placeName,
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
        checkInPlaceName: placeName,
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
    await notifyActionCompleted(user.id, "Check-in completed", requiresReview ? "Your check-in was submitted and marked pending review." : "Your check-in was recorded successfully.", selfServiceProfileHref(user.role));
    revalidatePath("/employee/attendance");
    revalidatePath("/employee/dashboard");
    revalidatePath("/manager/dashboard");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/today-attendance");
    revalidatePath("/admin/attendance");
    revalidatePath(`/admin/attendance/${record.id}`);
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
      checkOutPlaceName: placeName,
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
  await notifyActionCompleted(user.id, "Check-out completed", requiresReview ? "Your check-out was submitted and marked pending review." : "Your check-out was recorded successfully.", selfServiceProfileHref(user.role));
  revalidatePath("/employee/attendance");
  revalidatePath("/employee/dashboard");
  revalidatePath("/manager/dashboard");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/today-attendance");
  revalidatePath("/admin/attendance");
  revalidatePath(`/admin/attendance/${record.id}`);
  return { ok: true, message: requiresReview ? "Checked out and marked pending review." : "Checked out successfully." };
}

export async function applyForLeave(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role === Role.SUPER_ADMIN) return { ok: false, message: "Leave requests are not available for this account." };
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

  if (tracksLeaveBalance(leaveType)) {
    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: user.id,
          leaveTypeId: leaveType.id,
          year: parsed.data.startDate.getFullYear()
        }
      },
      create: {
        employeeId: user.id,
        leaveTypeId: leaveType.id,
        year: parsed.data.startDate.getFullYear(),
        entitlementDays: leaveType.annualEntitlementDays,
        usedDays: 0,
        remainingDays: leaveType.annualEntitlementDays
      },
      update: {}
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
      reason: parsed.data.reason
    }
  });
  await createAuditLog({
    actorId: user.id,
    action: "LEAVE_REQUEST_CREATED",
    entityType: "LeaveRequest",
    entityId: request.id,
    metadata: { totalDays, leaveType: leaveType.name }
  });
  await notifyActionCompleted(user.id, "Leave request submitted", `${leaveType.name} for ${totalDays} day${totalDays === 1 ? "" : "s"} was submitted for HR approval.`, selfServiceLeaveHref(user.role));
  revalidatePath("/employee/leave");
  return { ok: true, message: "Leave request submitted for approval." };
}

export async function decideLeaveRequest(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
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
  if (actor.id === request.employeeId) throw new Error("You cannot approve or reject your own leave request.");

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
    await createNotification({
      userId: request.employeeId,
      title: "Leave request rejected",
      message: `${request.leaveType.name} for ${request.totalDays} day${request.totalDays === 1 ? "" : "s"} was rejected.${updated.rejectionReason ? ` Reason: ${updated.rejectionReason}` : ""}`,
      href: selfServiceLeaveHref(request.employee.role)
    });
    await notifyActionCompleted(actor.id, "Leave request rejected", `You rejected ${request.employee.firstName} ${request.employee.lastName}'s ${request.leaveType.name} request.`, "/admin/leave-requests");
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
      if (tracksLeaveBalance(request.leaveType)) {
        const balance = await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year: request.startDate.getFullYear()
            }
          },
          create: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: request.startDate.getFullYear(),
            entitlementDays: request.leaveType.annualEntitlementDays,
            usedDays: 0,
            remainingDays: request.leaveType.annualEntitlementDays
          },
          update: {}
        });
        if (balance.remainingDays < request.totalDays) throw new Error("Insufficient leave balance for approval.");

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
    await createNotification({
      userId: request.employeeId,
      title: "Leave request approved",
      message: `${request.leaveType.name} for ${request.totalDays} day${request.totalDays === 1 ? "" : "s"} was approved.` ,
      href: selfServiceLeaveHref(request.employee.role)
    });
    await notifyActionCompleted(actor.id, "Leave request approved", `You approved ${request.employee.firstName} ${request.employee.lastName}'s ${request.leaveType.name} request.`, "/admin/leave-requests");
  }

  revalidatePath("/manager/leave-approvals");
  revalidatePath("/admin/leave-requests");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/today-attendance");
  revalidatePath("/admin/attendance");
  revalidatePath(selfServiceLeaveHref(request.employee.role));
  revalidatePath(selfServiceDashboardHref(request.employee.role));
  revalidatePath(`/admin/employees/${request.employeeId}`);
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
  await notifyActionCompleted(actor.id, "Attendance adjusted", "The attendance record was manually adjusted successfully.", `/admin/attendance/${updated.id}`);
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/today-attendance");
  revalidatePath(`/admin/attendance/${updated.id}`);
}

export async function createEmployee(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = employeeCreateSchema.safeParse({
    employeeId: formString(formData, "employeeId"),
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
  if (!parsed.success) throw new Error(validationErrorMessage(parsed.error, "Invalid account details."));
  const values = parsed.data;
  if (!canManageAccountRole(actor.role, values.role)) {
    throw new Error("You do not have permission to create an account with this role.");
  }

  const passwordHash = await hash(values.password, 12);
  const { password: _password, workExperiences, educationDetails, dependents, ...employeeData } = values;
  const employee = await prisma.user.create({
    data: {
      ...employeeData,
      passwordHash,
      employeeId: values.employeeId,
      departmentId: values.departmentId || null,
      managerId: values.managerId || null,
      secondaryManagerId: values.secondaryManagerId || null,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender || null,
      maritalStatus: values.maritalStatus || null,
      workExperiences: { create: workExperiences },
      educationDetails: { create: educationDetails },
      dependents: { create: dependents }
    }
  });

  const everyoneConversation = await prisma.conversation.findUnique({ where: { slug: "everyone" }, select: { id: true } });
  if (everyoneConversation) {
    await prisma.conversationMember.create({ data: { conversationId: everyoneConversation.id, userId: employee.id } });
  }

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
  await notifyActionCompleted(actor.id, "Account created", `${employee.firstName} ${employee.lastName}'s account was created successfully.`, `/admin/employees/${employee.id}`);
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
  const parsed = employeeSchema.omit({ password: true }).safeParse({
    employeeId: formString(formData, "employeeId"),
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
  if (!parsed.success) throw new Error(validationErrorMessage(parsed.error, "Invalid account details."));
  const values = parsed.data;
  if (!canManageAccountRole(actor.role, values.role)) {
    throw new Error("You do not have permission to assign this role.");
  }
  const { workExperiences, educationDetails, dependents, ...employeeData } = values;
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...employeeData,
      employeeId: values.employeeId || null,
      departmentId: values.departmentId || null,
      managerId: values.managerId || null,
      secondaryManagerId: values.secondaryManagerId || null,
      dateJoined: values.dateJoined || null,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender || null,
      maritalStatus: values.maritalStatus || null,
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
  await notifyActionCompleted(actor.id, "Account updated", `${updated.firstName} ${updated.lastName}'s account was updated successfully.`, `/admin/employees/${updated.id}`);
  revalidatePath(`/admin/employees/${id}`);
}

export async function resetUserPassword(formData: FormData) {
  const actor = await requireRole([Role.SUPER_ADMIN]);
  const parsed = passwordResetSchema.parse({
    userId: formString(formData, "userId"),
    password: formString(formData, "password")
  });
  const target = await prisma.user.findUnique({ where: { id: parsed.userId }, select: { id: true, role: true, email: true } });
  if (!target) throw new Error("Account not found.");
  if (target.role === Role.SUPER_ADMIN) throw new Error("Super Admin passwords cannot be reset from this screen.");

  const passwordHash = await hash(parsed.password, 12);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });
  await createAuditLog({
    actorId: actor.id,
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: target.id,
    metadata: { email: target.email, role: target.role }
  });
  await createNotification({
    userId: target.id,
    title: "Password reset by administrator",
    message: "Your password was reset by a Super Admin. Sign in with the temporary password shared with you and request a change if needed.",
    href: selfServiceProfileHref(target.role)
  });
  await notifyActionCompleted(actor.id, "Password reset completed", "The user password was reset successfully.", `/admin/employees/${target.id}`);
  revalidatePath(`/admin/employees/${target.id}`);
}

export async function markNotificationRead(formData: FormData) {
  const actor = await requireUser();
  const id = formString(formData, "id");
  if (!id) throw new Error("Missing notification id.");

  await prisma.notification.updateMany({
    where: { id, userId: actor.id, readAt: null },
    data: { readAt: new Date() }
  });
  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const actor = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() }
  });
  revalidatePath("/");
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
  await notifyActionCompleted(actor.id, "Profile updated", "Your profile was updated successfully.", selfServiceProfileHref(actor.role));
  revalidatePath("/employee/profile");
}

export async function createDepartment(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = departmentSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    managerId: formString(formData, "managerId")
  });
  const department = await prisma.department.create({
    data: { ...parsed, managerId: parsed.managerId || null }
  });
  await createAuditLog({ actorId: actor.id, action: "DEPARTMENT_CREATED", entityType: "Department", entityId: department.id, metadata: parsed });
  await notifyActionCompleted(actor.id, "Department created", `${department.name} was created successfully.`, "/admin/departments");
  revalidatePath("/admin/departments");
}

export async function updateDepartment(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const id = formString(formData, "id");
  if (!id) throw new Error("Missing department id.");
  const parsed = departmentSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    managerId: formString(formData, "managerId")
  });
  const department = await prisma.department.update({
    where: { id },
    data: { ...parsed, managerId: parsed.managerId || null }
  });
  await createAuditLog({ actorId: actor.id, action: "DEPARTMENT_UPDATED", entityType: "Department", entityId: department.id, metadata: parsed });
  await notifyActionCompleted(actor.id, "Department updated", `${department.name} was updated successfully.`, "/admin/departments");
  revalidatePath("/admin/departments");
}

export async function createLeaveType(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const parsed = leaveTypeSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    annualEntitlementDays: formString(formData, "annualEntitlementDays"),
    eligibilityMonths: formString(formData, "eligibilityMonths"),
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
  await notifyActionCompleted(actor.id, "Leave type created", `${type.name} was created successfully.`, "/admin/leave-types");
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
  await notifyActionCompleted(actor.id, "Work policy updated", "The work policy was saved successfully.", "/admin/settings");
  revalidatePath("/admin/settings");
}
