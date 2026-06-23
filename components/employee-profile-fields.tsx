"use client";

import { useMemo, useState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

export type WorkExperienceValue = {
  id?: string;
  companyName: string;
  jobTitle: string;
  fromDate: string;
  toDate: string;
  jobDescription: string;
  relevant: boolean;
};

export type EducationDetailValue = {
  id?: string;
  instituteName: string;
  degree: string;
  specialization: string;
  completionDate: string;
};

export type DependentValue = {
  id?: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
};

type Keyed<T> = T & { _key: string };

type Props = {
  personal?: {
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    aboutMe?: string;
    expertise?: string;
  };
  workExperiences?: WorkExperienceValue[];
  educationDetails?: EducationDetailValue[];
  dependents?: DependentValue[];
};

function withKeys<T extends { id?: string }>(values: T[]): Keyed<T>[] {
  return values.map((value, index) => ({ ...value, _key: value.id || `existing-${index}` }));
}

function withoutKeys<T extends { _key: string; id?: string }>(values: T[]) {
  return values.map(({ _key: _ignored, id: _id, ...value }) => value);
}

function newKey() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return String(age);
}

export function EmployeeProfileFields({ personal, workExperiences = [], educationDetails = [], dependents = [] }: Props) {
  const [dateOfBirth, setDateOfBirth] = useState(personal?.dateOfBirth || "");
  const [work, setWork] = useState(() => withKeys(workExperiences));
  const [education, setEducation] = useState(() => withKeys(educationDetails));
  const [family, setFamily] = useState(() => withKeys(dependents));
  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  return (
    <>
      <Card className="md:col-span-2">
        <h2 className="text-base font-semibold text-ink">Personal details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Date of birth">
            <Input name="dateOfBirth" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Age" hint="Calculated automatically from date of birth.">
            <Input value={age} placeholder="-" readOnly aria-readonly />
          </Field>
          <Field label="Gender">
            <Select name="gender" defaultValue={personal?.gender || ""}>
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="NON_BINARY">Non-binary</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </Select>
          </Field>
          <Field label="Marital status">
            <Select name="maritalStatus" defaultValue={personal?.maritalStatus || ""}>
              <option value="">Not specified</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="SEPARATED">Separated</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </Select>
          </Field>
          <Field label="About me">
            <Textarea name="aboutMe" defaultValue={personal?.aboutMe || ""} rows={4} maxLength={2000} placeholder="A short professional introduction" />
          </Field>
          <Field label="Ask me about / Expertise">
            <Textarea name="expertise" defaultValue={personal?.expertise || ""} rows={4} maxLength={1000} placeholder="Skills, subjects, or areas where colleagues can reach out" />
          </Field>
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Work experience</h2>
            <p className="mt-1 text-sm text-muted">Add previous roles and relevant experience.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setWork((items) => [...items, { _key: newKey(), companyName: "", jobTitle: "", fromDate: "", toDate: "", jobDescription: "", relevant: false }])}>Add experience</Button>
        </div>
        <input type="hidden" name="workExperiences" value={JSON.stringify(withoutKeys(work))} />
        <div className="mt-4 space-y-4">
          {work.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-muted">No work experience added.</p> : null}
          {work.map((item, index) => (
            <div key={item._key} className="rounded-lg border border-line bg-surface/50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Company name"><Input value={item.companyName} required onChange={(event) => setWork((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, companyName: event.target.value } : value))} /></Field>
                <Field label="Job title"><Input value={item.jobTitle} required onChange={(event) => setWork((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, jobTitle: event.target.value } : value))} /></Field>
                <Field label="From date"><Input type="date" value={item.fromDate} required onChange={(event) => setWork((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, fromDate: event.target.value } : value))} /></Field>
                <Field label="To date" hint="Leave blank if this is your current role."><Input type="date" value={item.toDate} min={item.fromDate || undefined} onChange={(event) => setWork((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, toDate: event.target.value } : value))} /></Field>
                <Field label="Job description"><Textarea value={item.jobDescription} rows={3} maxLength={2000} onChange={(event) => setWork((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, jobDescription: event.target.value } : value))} /></Field>
                <div className="flex flex-col justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink"><input type="checkbox" checked={item.relevant} onChange={(event) => setWork((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, relevant: event.target.checked } : value))} /> Relevant to current role</label>
                  <Button type="button" variant="danger" className="self-start" onClick={() => setWork((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Education details</h2>
            <p className="mt-1 text-sm text-muted">Add qualifications and completed studies.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setEducation((items) => [...items, { _key: newKey(), instituteName: "", degree: "", specialization: "", completionDate: "" }])}>Add education</Button>
        </div>
        <input type="hidden" name="educationDetails" value={JSON.stringify(withoutKeys(education))} />
        <div className="mt-4 space-y-4">
          {education.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-muted">No education details added.</p> : null}
          {education.map((item, index) => (
            <div key={item._key} className="rounded-lg border border-line bg-surface/50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Institute name"><Input value={item.instituteName} required onChange={(event) => setEducation((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, instituteName: event.target.value } : value))} /></Field>
                <Field label="Degree / Diploma"><Input value={item.degree} required onChange={(event) => setEducation((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, degree: event.target.value } : value))} /></Field>
                <Field label="Specialization"><Input value={item.specialization} onChange={(event) => setEducation((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, specialization: event.target.value } : value))} /></Field>
                <Field label="Date of completion"><Input type="date" value={item.completionDate} onChange={(event) => setEducation((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, completionDate: event.target.value } : value))} /></Field>
              </div>
              <Button type="button" variant="danger" className="mt-4" onClick={() => setEducation((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Dependent details</h2>
            <p className="mt-1 text-sm text-muted">Add family members or other dependents.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setFamily((items) => [...items, { _key: newKey(), name: "", relationship: "", dateOfBirth: "" }])}>Add dependent</Button>
        </div>
        <input type="hidden" name="dependents" value={JSON.stringify(withoutKeys(family))} />
        <div className="mt-4 space-y-4">
          {family.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-muted">No dependents added.</p> : null}
          {family.map((item, index) => (
            <div key={item._key} className="rounded-lg border border-line bg-surface/50 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Name"><Input value={item.name} required onChange={(event) => setFamily((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, name: event.target.value } : value))} /></Field>
                <Field label="Relationship"><Input value={item.relationship} required onChange={(event) => setFamily((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, relationship: event.target.value } : value))} /></Field>
                <Field label="Date of birth"><Input type="date" value={item.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setFamily((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, dateOfBirth: event.target.value } : value))} /></Field>
              </div>
              <Button type="button" variant="danger" className="mt-4" onClick={() => setFamily((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
