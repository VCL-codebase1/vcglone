import { EmployeeProfileFields } from "@/components/employee-profile-fields";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { updateOwnProfile } from "@/lib/actions";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      department: true,
      manager: true,
      secondaryManager: true,
      workExperiences: { orderBy: { fromDate: "desc" } },
      educationDetails: { orderBy: { completionDate: "desc" } },
      dependents: { orderBy: { name: "asc" } }
    }
  });
  if (!user) return null;

  const employmentRows = [
    ["Employee ID", user.employeeId || "-"],
    ["Role", user.role.replace("_", " ")],
    ["Department", user.department?.name || "-"],
    ["Job title", user.jobTitle || "-"],
    ["Date joined", formatDate(user.dateJoined)],
    ["Reporting manager", user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : "-"],
    ["Secondary reporting manager", user.secondaryManager ? `${user.secondaryManager.firstName} ${user.secondaryManager.lastName}` : "-"],
    ["Employment status", user.employmentStatus.replace("_", " ")]
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Profile" description="Keep your personal, professional, education, and dependent information up to date." />

      <Card>
        <h2 className="text-base font-semibold text-ink">Employment and hierarchy</h2>
        <p className="mt-1 text-sm text-muted">Contact HR if any of these assigned details need to change.</p>
        <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
          {employmentRows.map(([label, value]) => (
            <div key={label} className="grid gap-1 border-b border-line py-3 sm:grid-cols-2">
              <dt className="text-sm font-medium text-muted">{label}</dt>
              <dd className="text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <form action={updateOwnProfile} className="grid gap-6 md:grid-cols-2">
        <Card className="grid gap-4 md:col-span-2 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-base font-semibold text-ink">Basic information</h2>
            <p className="mt-1 text-sm text-muted">Your email is used for login and can only be changed by HR.</p>
          </div>
          <Field label="First name"><Input name="firstName" defaultValue={user.firstName} required /></Field>
          <Field label="Last name"><Input name="lastName" defaultValue={user.lastName} required /></Field>
          <Field label="Email"><Input value={user.email} readOnly aria-readonly /></Field>
          <Field label="Phone"><Input name="phone" type="tel" defaultValue={user.phone || ""} /></Field>
        </Card>

        <EmployeeProfileFields
          personal={{
            dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10),
            gender: user.gender || undefined,
            maritalStatus: user.maritalStatus || undefined,
            aboutMe: user.aboutMe || undefined,
            expertise: user.expertise || undefined
          }}
          workExperiences={user.workExperiences.map((item) => ({ ...item, fromDate: item.fromDate.toISOString().slice(0, 10), toDate: item.toDate?.toISOString().slice(0, 10) || "", jobDescription: item.jobDescription || "" }))}
          educationDetails={user.educationDetails.map((item) => ({ ...item, completionDate: item.completionDate?.toISOString().slice(0, 10) || "", specialization: item.specialization || "" }))}
          dependents={user.dependents.map((item) => ({ ...item, dateOfBirth: item.dateOfBirth?.toISOString().slice(0, 10) || "" }))}
        />

        <div className="md:col-span-2"><Button type="submit">Save profile</Button></div>
      </form>
    </div>
  );
}
