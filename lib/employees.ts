export const FORMER_EMPLOYEE_EMAIL = "former.employee.records@system.vcglone.invalid";

export function visibleEmployeeWhere() {
  return { email: { not: FORMER_EMPLOYEE_EMAIL } } as const;
}
