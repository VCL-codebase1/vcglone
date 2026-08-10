export const KNOWLEDGE_CATEGORIES = [
  "Standard Operating Procedures",
  "Company Policies",
  "Rules & Regulations",
  "Forms & Templates",
  "Guides & Handbooks",
  "Other Documents"
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function knowledgeBaseHref(role: string) {
  if (role === "SUPER_ADMIN" || role === "HR_ADMIN") return "/admin/knowledge-base";
  if (role === "MANAGER") return "/manager/knowledge-base";
  return "/employee/knowledge-base";
}
