import { Download, FileSpreadsheet, FileText, Search, Upload } from "lucide-react";
import Link from "next/link";
import { KnowledgeDocumentActions } from "@/components/knowledge-document-actions";
import { KnowledgeUploadForm } from "@/components/knowledge-upload-form";
import { Card, EmptyState, PageHeader, PageToolbar, WorkspaceSection } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatFileSize, KNOWLEDGE_CATEGORIES } from "@/lib/knowledge-base";
import { prisma } from "@/lib/prisma";

type SearchParams = { search?: string; category?: string };

function documentIcon(mimeType: string) {
  return mimeType.includes("sheet") || mimeType.includes("excel") || mimeType === "text/csv" ? FileSpreadsheet : FileText;
}

export async function KnowledgeBasePage({ admin, searchParams }: { admin: boolean; searchParams: SearchParams }) {
  const search = searchParams.search?.trim() || "";
  const category = KNOWLEDGE_CATEGORIES.includes(searchParams.category as never) ? searchParams.category : undefined;
  const documents = await prisma.knowledgeDocument.findMany({
    where: {
      published: admin ? undefined : true,
      category,
      OR: search ? [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } }
      ] : undefined
    },
    include: { uploader: { select: { firstName: true, lastName: true } } },
    orderBy: [{ published: "desc" }, { createdAt: "desc" }]
  });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Knowledge Base"
        description={admin ? "Upload and manage company documents." : "Company policies, procedures, guides, and forms."}
      />

      {admin ? (
        <WorkspaceSection title="Upload document" description="Publish policies, procedures, guides, and company resources for staff.">
          <div className="hidden items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
            <Upload className="h-5 w-5 text-brand" />
            <h2 className="font-semibold text-ink">Upload document</h2>
          </div>
          <div><KnowledgeUploadForm /></div>
        </WorkspaceSection>
      ) : null}

      <PageToolbar><form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]">
        <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted" /><input name="search" defaultValue={searchParams.search} className="workspace-control w-full pl-10" placeholder="Search documents…" /></label>
        <select name="category" defaultValue={searchParams.category || ""} className="workspace-control"><option value="">All categories</option>{KNOWLEDGE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="workspace-action">Apply</button>
      </form></PageToolbar>

      {documents.length ? (
        <div className="divide-y divide-line border-y border-line">
          {documents.map((document) => {
            const Icon = documentIcon(document.mimeType);
            return (
              <article key={document.id} className="group grid min-w-0 gap-3 py-4 transition hover:bg-surface/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brandSoft text-brand"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-muted">{document.category}</p>{admin && !document.published ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Draft</span> : null}</div>
                    <h2 className="mt-1 break-words font-semibold leading-6 text-ink">{document.title}</h2>
                  {document.description ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{document.description}</p> : null}
                  <p className="mt-2 truncate text-xs text-muted">{document.fileName} · {formatFileSize(document.size)} · Added {formatDate(document.createdAt)} by {document.uploader.firstName} {document.uploader.lastName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <Link href={`/api/knowledge-base/documents/${document.id}`} target="_blank" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brandSoft"><Download className="h-4 w-4" />Open</Link>
                  {admin ? <KnowledgeDocumentActions id={document.id} published={document.published} /> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : <Card><EmptyState title="No documents found" description={search || category ? "Try another search or category." : admin ? "Upload the first company document to start the library." : "HR has not published any documents yet."} /></Card>}
    </div>
  );
}
