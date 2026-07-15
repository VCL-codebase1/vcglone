import { Role, TaskStatus } from "@prisma/client";
import { ArrowLeft, CalendarClock, File, Link as LinkIcon, MessageSquare, Paperclip, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { addTaskComment, addTaskResource, approveTask, blockTask, cancelTask, requestTaskChanges, resumeTask, startTask, submitTaskForReview, updateTask } from "@/lib/task-actions";
import { canAccessTask, isTaskOverdue } from "@/lib/tasks";

function datetimeLocal(date: Date) {
  return new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
}

export async function TaskDetailPage({ taskId }: { taskId: string }) {
  const actor = await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { include: { department: { select: { name: true } } } },
      assignedBy: true,
      resources: { include: { uploader: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "asc" } },
      activities: { include: { actor: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 50 }
    }
  });
  if (!task || !(await canAccessTask(actor, task))) notFound();
  const overdue = isTaskOverdue(task);
  const closed = task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED;
  const isAssignee = task.assigneeId === actor.id;
  const reviewer = actor.role === Role.HR_ADMIN || actor.role === Role.SUPER_ADMIN || task.assignedById === actor.id || (actor.role === Role.MANAGER && (task.assignee.managerId === actor.id || task.assignee.secondaryManagerId === actor.id));
  const backHref = actor.role === Role.EMPLOYEE ? "/employee/tasks" : actor.role === Role.MANAGER ? "/manager/tasks" : "/admin/tasks";
  const assignees = reviewer && !closed ? await prisma.user.findMany({
    where: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN }, ...(actor.role === Role.MANAGER ? { OR: [{ id: actor.id }, { managerId: actor.id }, { secondaryManagerId: actor.id }] } : {}) },
    select: { id: true, firstName: true, lastName: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  }) : [];

  return <div className="space-y-5">
    <PageHeader title={task.name} description={`${task.taskCode} · Delegated by ${task.assignedBy.firstName} ${task.assignedBy.lastName}`} action={<div className="flex flex-wrap items-center gap-2"><StatusBadge value={overdue ? "OVERDUE" : task.status} /><Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><ArrowLeft className="h-4 w-4" />Back</Link></div>} />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-5">
        <Card className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-surface p-3"><div className="flex items-center gap-2 text-xs text-muted"><UserRound className="h-4 w-4" />Assignee</div><p className="mt-1 font-semibold text-ink">{task.assignee.firstName} {task.assignee.lastName}</p><p className="text-xs text-muted">{task.assignee.department?.name || task.assignee.jobTitle || "Team member"}</p></div>
            <div className="rounded-xl bg-surface p-3"><div className="flex items-center gap-2 text-xs text-muted"><CalendarClock className="h-4 w-4" />Deadline</div><p className={overdue ? "mt-1 font-semibold text-amber-700" : "mt-1 font-semibold text-ink"}>{formatDateTime(task.dueAt)}</p><p className="text-xs text-muted">{task.priority} priority</p></div>
            <div className="rounded-xl bg-surface p-3"><p className="text-xs text-muted">Started</p><p className="mt-1 font-semibold text-ink">{formatDateTime(task.startedAt)}</p><p className="text-xs text-muted">Submitted {formatDateTime(task.submittedAt)}</p></div>
          </div>
          <section><h2 className="font-semibold text-ink">Task brief</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{task.description}</p></section>
          {task.expectedOutcome ? <section className="rounded-xl border border-line bg-brandSoft/40 p-4"><h2 className="font-semibold text-ink">Expected outcome</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{task.expectedOutcome}</p></section> : null}
          {task.blockedReason ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"><h2 className="font-semibold text-amber-900 dark:text-amber-100">Current blocker</h2><p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{task.blockedReason}</p></section> : null}
          {task.reviewComment ? <section className="rounded-xl border border-line p-4"><h2 className="font-semibold text-ink">Latest review note</h2><p className="mt-1 whitespace-pre-wrap text-sm text-muted">{task.reviewComment}</p></section> : null}
        </Card>

        {isAssignee && !closed ? <Card className="space-y-4"><div><h2 className="font-semibold text-ink">Update your work</h2><p className="text-sm text-muted">Keep the manager informed and submit only when the work is ready for review.</p></div>
          <div className="flex flex-wrap gap-2">
            {task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.CHANGES_REQUESTED ? <form action={startTask}><input type="hidden" name="taskId" value={task.id} /><Button>Start work</Button></form> : null}
            {task.status === TaskStatus.BLOCKED ? <form action={resumeTask}><input type="hidden" name="taskId" value={task.id} /><Button>Resume work</Button></form> : null}
          </div>
          {task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.CHANGES_REQUESTED ? <form action={blockTask} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input type="hidden" name="taskId" value={task.id} /><Input name="reason" required placeholder="What is blocking progress?" /><Button variant="secondary">Raise blocker</Button></form> : null}
          {task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.CHANGES_REQUESTED ? <form action={submitTaskForReview} className="space-y-3"><input type="hidden" name="taskId" value={task.id} /><Field label="Completion note" hint="Summarize what was completed and where the result can be found."><Textarea name="note" rows={3} placeholder="Work completed, validation performed, and result attached…" /></Field><Button>Submit for review</Button></form> : null}
          {task.status === TaskStatus.IN_REVIEW ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Your completion is waiting for manager review.</p> : null}
        </Card> : null}

        {reviewer && task.status === TaskStatus.IN_REVIEW ? <Card className="space-y-4"><div><h2 className="font-semibold text-ink">Review completion</h2><p className="text-sm text-muted">Check the outcome and resources before making a decision.</p></div>{task.submissionNote ? <p className="rounded-xl bg-surface p-3 text-sm text-ink">{task.submissionNote}</p> : null}<div className="grid gap-4 lg:grid-cols-2"><form action={approveTask} className="space-y-3 rounded-xl border border-emerald-200 p-4"><input type="hidden" name="taskId" value={task.id} /><Field label="Approval note"><Textarea name="comment" rows={3} placeholder="Optional feedback" /></Field><Button>Approve completion</Button></form><form action={requestTaskChanges} className="space-y-3 rounded-xl border border-amber-200 p-4"><input type="hidden" name="taskId" value={task.id} /><Field label="Required changes"><Textarea name="comment" required rows={3} placeholder="Explain exactly what needs to change" /></Field><Button variant="danger">Request changes</Button></form></div></Card> : null}

        <Card className="space-y-4"><div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-brand" /><div><h2 className="font-semibold text-ink">Task discussion</h2><p className="text-sm text-muted">Decision and progress context stays attached to the task.</p></div></div><div className="space-y-3">{task.comments.length ? task.comments.map((comment) => <div key={comment.id} className="rounded-xl bg-surface p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">{comment.author.firstName} {comment.author.lastName}</p><time className="text-xs text-muted">{formatDateTime(comment.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap text-sm text-muted">{comment.body}</p></div>) : <p className="text-sm text-muted">No comments yet.</p>}</div>{!closed ? <form action={addTaskComment} className="space-y-3"><input type="hidden" name="taskId" value={task.id} /><Textarea name="body" required rows={3} placeholder="Add a progress update or question…" /><Button variant="secondary">Add comment</Button></form> : null}</Card>
      </div>

      <div className="space-y-5">
        <Card className="space-y-4"><div className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-brand" /><div><h2 className="font-semibold text-ink">Resources</h2><p className="text-sm text-muted">Files and links needed for delivery.</p></div></div><div className="space-y-2">{task.resources.length ? task.resources.map((resource) => resource.type === "LINK" && resource.url ? <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-medium text-brand hover:bg-surface"><LinkIcon className="h-4 w-4 shrink-0" /><span className="min-w-0 truncate">{resource.title}</span></a> : <a key={resource.id} href={`/api/tasks/resources/${resource.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-medium text-brand hover:bg-surface"><File className="h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block truncate">{resource.fileName}</span><span className="text-xs font-normal text-muted">{resource.size ? `${Math.ceil(resource.size / 1024)} KB` : "File"}</span></span></a>) : <p className="text-sm text-muted">No resources added.</p>}</div>{!closed ? <form action={addTaskResource} encType="multipart/form-data" className="space-y-3 border-t border-line pt-4"><input type="hidden" name="taskId" value={task.id} /><Field label="Add link"><Input name="resourceLinks" type="url" placeholder="https://…" /></Field><Field label="Or attach files"><Input name="resources" type="file" multiple /></Field><Button variant="secondary">Add resources</Button></form> : null}</Card>

        {reviewer && !closed ? <Card className="space-y-4"><div><h2 className="font-semibold text-ink">Manager controls</h2><p className="text-sm text-muted">Changing ownership or deadline requires an audit reason.</p></div><form action={updateTask} className="space-y-3"><input type="hidden" name="taskId" value={task.id} /><Field label="Assignee"><Select name="assigneeId" defaultValue={task.assigneeId}>{assignees.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</Select></Field><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Field label="Priority"><Select name="priority" defaultValue={task.priority}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Deadline"><Input name="dueAt" type="datetime-local" defaultValue={datetimeLocal(task.dueAt)} required /></Field></div><Field label="Reason for material change"><Textarea name="reason" rows={2} placeholder="Required if assignee or deadline changes" /></Field><Button variant="secondary">Save task controls</Button></form><form action={cancelTask} className="space-y-3 border-t border-line pt-4"><input type="hidden" name="taskId" value={task.id} /><Input name="reason" required placeholder="Reason for cancellation" /><Button variant="danger">Cancel task</Button></form></Card> : null}

        <Card className="space-y-3"><h2 className="font-semibold text-ink">Activity</h2><div className="space-y-3">{task.activities.map((activity) => <div key={activity.id} className="border-l-2 border-line pl-3"><p className="text-sm text-ink">{activity.message}</p><p className="text-xs text-muted">{activity.actor ? `${activity.actor.firstName} ${activity.actor.lastName} · ` : ""}{formatDateTime(activity.createdAt)}</p></div>)}</div></Card>
      </div>
    </div>
  </div>;
}
