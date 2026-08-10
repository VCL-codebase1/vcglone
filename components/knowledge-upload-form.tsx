"use client";

import { CheckCircle2, UploadCloud } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { KNOWLEDGE_CATEGORIES } from "@/lib/knowledge-base";
import { uploadKnowledgeDocument, type KnowledgeUploadState } from "@/lib/knowledge-actions";

const initialState: KnowledgeUploadState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}><UploadCloud className="h-4 w-4" />{pending ? "Uploading…" : "Upload document"}</Button>;
}

export function KnowledgeUploadForm() {
  const [state, action] = useFormState(uploadKnowledgeDocument, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) formRef.current?.reset(); }, [state]);

  return (
    <form ref={formRef} action={action} encType="multipart/form-data" className="grid gap-4 lg:grid-cols-2">
      <Field label="Document title"><Input name="title" required minLength={3} maxLength={160} placeholder="e.g. Employee Code of Conduct" /></Field>
      <Field label="Category">
        <Select name="category" defaultValue={KNOWLEDGE_CATEGORIES[0]}>{KNOWLEDGE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</Select>
      </Field>
      <div className="lg:col-span-2"><Field label="Summary" hint="A short explanation helps employees find the right document."><Textarea name="description" rows={3} maxLength={600} placeholder="What this document covers and when employees should use it." /></Field></div>
      <div className="lg:col-span-2"><Field label="Document file" hint="PDF, Word, Excel, PowerPoint, text, or CSV. Maximum 10 MB."><Input name="document" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" required /></Field></div>
      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink">
        <input type="checkbox" name="published" defaultChecked className="h-4 w-4 accent-brand" />
        Publish immediately for employees
      </label>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
        {state.message ? <p role="status" className={`flex items-center gap-1.5 text-sm ${state.ok ? "text-emerald-700" : "text-danger"}`}>{state.ok ? <CheckCircle2 className="h-4 w-4" /> : null}{state.message}</p> : null}
        <SubmitButton />
      </div>
    </form>
  );
}
