import { BookOpen, Download, FileSpreadsheet, FileText, Search, ShieldCheck } from "lucide-react";
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
  const publishedCount = documents.filter((document) => document.published).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description={admin ? "Publish and manage the policies, procedures, and reference documents employees rely on." : "Find current company policies, procedures, guides, and shared resources in one place."}
      />

      {admin ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line bg-gradient-to-r from-brandSoft via-white to-cyan-50 px-5 py-4 dark:from-panel dark:via-panel dark:to-panel sm:px-6">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-semibold text-ink">Add to the library</h2><p className="text-sm text-muted">Upload a controlled document and choose when employees can see it.</p></div></div>
          </div>
          <div className="p-5 sm:p-6"><KnowledgeUploadForm /></div>
        </Card>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-[#102b74] to-[#194488] p-5 text-white shadow-[0_18px_45px_rgba(16,43,116,0.18)] sm:p-6">
          <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><BookOpen className="h-6 w-6" /></span><div><p className="text-sm font-semibold text-blue-100">Company resource library</p><p className="mt-1 text-lg font-semibold">{publishedCount} document{publishedCount === 1 ? "" : "s"} available</p><p className="mt-1 text-sm text-blue-100">Documents are maintained by HR so you can always find the current version.</p></div></div>
        </div>
      )}

      <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft dark:bg-panel sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]">
        <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" /><input name="search" defaultValue={searchParams.search} className="focus-ring min-h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-ink" placeholder="Search documents…" /></label>
        <select name="category" defaultValue={searchParams.category || ""} className="focus-ring min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink dark:bg-panel"><option value="">All categories</option>{KNOWLEDGE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="min-h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#0b1f56]">Search</button>
      </form>

      {documents.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {documents.map((document) => {
            const Icon = documentIcon(document.mimeType);
            return (
              <Card key={document.id} className="group flex min-w-0 flex-col gap-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(23,32,51,0.09)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brandSoft text-brand dark:bg-surface"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">{document.category}</span>{admin && !document.published ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase text-amber-800">Draft</span> : null}</div><h2 className="mt-2 break-words font-semibold leading-6 text-ink">{document.title}</h2></div>
                </div>
                <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted">{document.description || "Open this document to view the complete company resource."}</p>
                <div className="mt-auto border-t border-line pt-3 text-xs text-muted"><p className="truncate">{document.fileName}</p><p className="mt-1">{formatFileSize(document.size)} · Added {formatDate(document.createdAt)} by {document.uploader.firstName} {document.uploader.lastName}</p></div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/api/knowledge-base/documents/${document.id}`} target="_blank" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0b1f56]"><Download className="h-4 w-4" />Open document</Link>
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
