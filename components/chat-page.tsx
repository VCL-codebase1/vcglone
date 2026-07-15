import { ChatWorkspace } from "@/components/chat-workspace";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/rbac";

export async function ChatPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader title="Chat" description="Send direct messages and collaborate in group conversations." />
      <ChatWorkspace currentUser={{ id: user.id, name: `${user.firstName} ${user.lastName}` }} />
    </div>
  );
}
