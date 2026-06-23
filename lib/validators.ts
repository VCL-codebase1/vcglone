import { AttendanceStatus, EmploymentStatus, Gender, LeaveRequestStatus, MaritalStatus, Role } from "@prisma/client";
import { z } from "zod";

export const emailSchema = z.string().email().toLowerCase();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8)
});

export const attendanceActionSchema = z.object({
  action: z.enum(["check-in", "check-out"]),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracy: z.coerce.number().nonnegative().optional(),
  note: z.string().trim().max(500).optional(),
  userAgent: z.string().max(1000).optional()
});

export const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Select a leave type."),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().trim().min(10, "Add a reason with at least 10 characters.").max(1000)
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date must be on or after start date."
  });

export const approvalSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  comment: z.string().trim().max(1000).optional()
});

const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.date().optional()
);

const optionalTextSchema = (max: number) => z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().max(max).optional()
);

export const workExperienceSchema = z
  .object({
    companyName: z.string().trim().min(2).max(150),
    jobTitle: z.string().trim().min(2).max(150),
    fromDate: z.coerce.date(),
    toDate: optionalDateSchema,
    jobDescription: optionalTextSchema(2000),
    relevant: z.boolean().default(false)
  })
  .refine((value) => !value.toDate || value.toDate >= value.fromDate, {
    path: ["toDate"],
    message: "To date must be on or after from date."
  });

export const educationDetailSchema = z.object({
  instituteName: z.string().trim().min(2).max(200),
  degree: z.string().trim().min(2).max(150),
  specialization: optionalTextSchema(150),
  completionDate: optionalDateSchema
});

export const dependentSchema = z.object({
  name: z.string().trim().min(2).max(150),
  relationship: z.string().trim().min(2).max(100),
  dateOfBirth: optionalDateSchema
});

export const profileCollectionsSchema = z.object({
  workExperiences: z.array(workExperienceSchema).max(20),
  educationDetails: z.array(educationDetailSchema).max(20),
  dependents: z.array(dependentSchema).max(20)
});

export const personalProfileSchema = z.object({
  dateOfBirth: optionalDateSchema,
  gender: z.nativeEnum(Gender).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  aboutMe: optionalTextSchema(2000),
  expertise: optionalTextSchema(1000)
});

export const employeeSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: emailSchema,
  phone: z.string().trim().optional(),
  password: z.string().min(12).optional(),
  role: z.nativeEnum(Role),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  secondaryManagerId: z.string().optional(),
  employmentStatus: z.nativeEnum(EmploymentStatus),
  jobTitle: z.string().trim().optional(),
  dateJoined: optionalDateSchema
}).merge(personalProfileSchema).merge(profileCollectionsSchema);

export const employeeCreateSchema = employeeSchema.extend({
  password: z.string().min(12, "Use an initial password with at least 12 characters.")
});

export const employeeSelfProfileSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: z.string().trim().max(50).optional()
}).merge(personalProfileSchema).merge(profileCollectionsSchema);

export const departmentSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  managerId: z.string().optional()
});

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  annualEntitlementDays: z.coerce.number().int().min(0).max(365),
  requiresDocument: z.coerce.boolean().optional(),
  requiresApproval: z.coerce.boolean().optional(),
  isPaid: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional()
});

export const manualAttendanceSchema = z.object({
  recordId: z.string().min(1),
  status: z.nativeEnum(AttendanceStatus),
  reason: z.string().trim().min(10, "A detailed adjustment reason is required.")
});

export const workPolicySchema = z.object({
  workStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  workEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  gracePeriodMinutes: z.coerce.number().int().min(0).max(240),
  timezone: z.string().trim().min(3),
  workingDays: z.array(z.string()).min(1)
});

export const reportStatusSchema = z.nativeEnum(LeaveRequestStatus).optional();
