import { ChatWorkspace } from "@/components/chat-workspace";
import { PageHeader } from "@/components/ui";
import { ensureEveryoneConversation } from "@/lib/chat";
import { requireUser } from "@/lib/rbac";

export async function ChatPage() {
  const user = await requireUser();
  await ensureEveryoneConversation();
  return (
    <div className="space-y-0 md:space-y-6">
      <div className="hidden md:block">
        <PageHeader title="Chat" description="Send direct messages and collaborate in group conversations." />
      </div>
      <ChatWorkspace currentUser={{ id: user.id, name: `${user.firstName} ${user.lastName}` }} />
    </div>
  );
}
