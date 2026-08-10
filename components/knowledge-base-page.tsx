import { Download, FileSpreadsheet, FileText, Search, Upload } from "lucide-react";
import Link from "next/link";
import { KnowledgeDocumentActions } from "@/components/knowledge-document-actions";
import { KnowledgeUploadForm } from "@/components/knowledge-upload-form";
import { Card, EmptyState, PageHeader } from "@/components/ui";
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
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
            <Upload className="h-5 w-5 text-brand" />
            <h2 className="font-semibold text-ink">Upload document</h2>
          </div>
          <div className="p-5 sm:p-6"><KnowledgeUploadForm /></div>
        </Card>
      ) : null}

      <form className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-line sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]">
        <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" /><input name="search" defaultValue={searchParams.search} className="focus-ring min-h-11 w-full rounded-full border border-transparent bg-surface pl-10 pr-4 text-sm text-ink" placeholder="Search documents…" /></label>
        <select name="category" defaultValue={searchParams.category || ""} className="focus-ring min-h-11 rounded-full border border-transparent bg-surface px-4 text-sm text-ink"><option value="">All categories</option>{KNOWLEDGE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="min-h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,58,121,0.16)] transition hover:bg-[#1c316e]">Apply</button>
      </form>

      {documents.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {documents.map((document) => {
            const Icon = documentIcon(document.mimeType);
            return (
              <Card key={document.id} className="group flex min-w-0 flex-col gap-4 border-line/80 transition duration-200 hover:border-brand/30 hover:shadow-[0_12px_28px_rgba(23,32,51,0.07)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brandSoft text-brand"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-muted">{document.category}</p>{admin && !document.published ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Draft</span> : null}</div><h2 className="mt-1 break-words font-semibold leading-6 text-ink">{document.title}</h2></div>
                </div>
                {document.description ? <p className="line-clamp-3 text-sm leading-5 text-muted">{document.description}</p> : null}
                <div className="mt-auto border-t border-line pt-3 text-xs text-muted"><p className="truncate">{document.fileName}</p><p className="mt-1">{formatFileSize(document.size)} · Added {formatDate(document.createdAt)} by {document.uploader.firstName} {document.uploader.lastName}</p></div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/api/knowledge-base/documents/${document.id}`} target="_blank" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,58,121,0.14)] transition hover:bg-[#1c316e]"><Download className="h-4 w-4" />Open document</Link>
                  {admin ? <KnowledgeDocumentActions id={document.id} published={document.published} /> : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : <Card><EmptyState title="No documents found" description={search || category ? "Try another search or category." : admin ? "Upload the first company document to start the library." : "HR has not published any documents yet."} /></Card>}
    </div>
  );
}
