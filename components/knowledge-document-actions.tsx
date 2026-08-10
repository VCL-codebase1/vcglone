"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { deleteKnowledgeDocument, setKnowledgeDocumentPublished } from "@/lib/knowledge-actions";

export function KnowledgeDocumentActions({ id, published }: { id: string; published: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={setKnowledgeDocumentPublished}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="published" value={String(!published)} />
        <Button type="submit" variant="secondary" className="min-h-9 px-3 py-1.5 text-xs">
          {published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {published ? "Unpublish" : "Publish"}
        </Button>
      </form>
      <form action={deleteKnowledgeDocument} onSubmit={(event) => { if (!window.confirm("Delete this document permanently?")) event.preventDefault(); }}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="danger" className="min-h-9 px-3 py-1.5 text-xs"><Trash2 className="h-3.5 w-3.5" />Delete</Button>
      </form>
    </div>
  );
}
