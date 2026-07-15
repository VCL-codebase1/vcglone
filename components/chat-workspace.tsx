"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquarePlus, Search, Send, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "@/lib/toast";
import { Button, Dialog, DialogClose, DialogContent, DialogTrigger, Input, Textarea } from "@/components/ui";

type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  updatedAt: string;
  unreadCount: number;
  members: { id: string; name: string; jobTitle?: string | null; active: boolean }[];
  lastMessage: { body: string; senderName: string; createdAt: string } | null;
};

type ChatUser = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  jobTitle?: string | null;
  role: string;
  department?: { name: string } | null;
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
  sender: { id: string; name: string };
};

type MessagePage = { messages: ChatMessage[]; hasMore: boolean };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message || "The chat request failed.");
  return payload;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function shortTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function NewConversationDialog({ onCreated }: { onCreated: (conversationId: string) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const { data, isLoading } = useQuery({
    queryKey: ["chat-users"],
    queryFn: () => fetchJson<{ users: ChatUser[] }>("/api/chat/users"),
    enabled: open,
    staleTime: 60_000
  });
  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.users || [];
    return (data?.users || []).filter((user) => [user.firstName, user.lastName, user.employeeId, user.jobTitle, user.department?.name]
      .filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [data?.users, search]);
  const createConversation = useMutation({
    mutationFn: () => fetchJson<{ conversation: { id: string } }>("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: type === "GROUP" ? name : undefined, memberIds })
    }),
    onSuccess: async ({ conversation }) => {
      await queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      onCreated(conversation.id);
      setOpen(false);
      setName("");
      setSearch("");
      setMemberIds([]);
      toast.success("Conversation ready");
    },
    onError: (error: Error) => toast.error(error.message)
  });

  function selectMember(userId: string) {
    if (type === "DIRECT") setMemberIds([userId]);
    else setMemberIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  function switchType(nextType: "DIRECT" | "GROUP") {
    setType(nextType);
    setMemberIds([]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" className="w-full"><MessageSquarePlus className="h-4 w-4" aria-hidden />New chat</Button></DialogTrigger>
      <DialogContent title="Start a conversation" description="Choose one person for a direct chat or several people for a group.">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
            <button type="button" onClick={() => switchType("DIRECT")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${type === "DIRECT" ? "bg-white text-brand shadow-soft" : "text-muted"}`}>Direct</button>
            <button type="button" onClick={() => switchType("GROUP")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${type === "GROUP" ? "bg-white text-brand shadow-soft" : "text-muted"}`}>Group</button>
          </div>
          {type === "GROUP" ? <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Group name" maxLength={100} /> : null}
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" className="pl-9" /></div>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {isLoading ? <p className="p-3 text-sm text-muted">Loading employees...</p> : visibleUsers.map((user) => {
              const selected = memberIds.includes(user.id);
              return (
                <button key={user.id} type="button" onClick={() => selectMember(user.id)} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition ${selected ? "bg-brandSoft ring-1 ring-brand/20" : "hover:bg-surface"}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{initials(`${user.firstName} ${user.lastName}`)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{user.firstName} {user.lastName}</span><span className="block truncate text-xs text-muted">{user.jobTitle || user.department?.name || user.role.replace("_", " ")}</span></span>
                  <span className={`h-4 w-4 rounded-full border-2 ${selected ? "border-brand bg-brand" : "border-line bg-white"}`} aria-hidden />
                </button>
              );
            })}
            {!isLoading && !visibleUsers.length ? <p className="p-3 text-sm text-muted">No employees found.</p> : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="button" disabled={createConversation.isPending || !memberIds.length || (type === "GROUP" && name.trim().length < 2)} onClick={() => createConversation.mutate()}>{createConversation.isPending ? "Creating..." : "Start chat"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChatWorkspace({ currentUser }: { currentUser: { id: string; name: string } }) {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [messageBody, setMessageBody] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => fetchJson<{ conversations: Conversation[] }>("/api/chat/conversations"),
    refetchInterval: 5_000
  });
  const conversations = useMemo(() => conversationsQuery.data?.conversations || [], [conversationsQuery.data?.conversations]);
  const visibleConversations = conversations.filter((conversation) => conversation.title.toLowerCase().includes(conversationSearch.trim().toLowerCase()));
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId);

  const messagesQuery = useInfiniteQuery({
    queryKey: ["chat-messages", selectedConversationId],
    queryFn: ({ pageParam }) => fetchJson<MessagePage>(`/api/chat/conversations/${selectedConversationId}/messages${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ""}`),
    enabled: Boolean(selectedConversationId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.messages[0]?.createdAt : undefined,
    refetchInterval: 3_000
  });
  const messages = useMemo(() => (messagesQuery.data?.pages || []).slice().reverse().flatMap((page) => page.messages), [messagesQuery.data?.pages]);

  useEffect(() => {
    if (!selectedConversationId || !messages.length) return;
    queryClient.setQueryData<{ conversations: Conversation[] }>(["chat-conversations"], (current) => current ? {
      conversations: current.conversations.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, unreadCount: 0 } : conversation)
    } : current);
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, queryClient, selectedConversationId]);

  const sendMessage = useMutation({
    mutationFn: (body: string) => fetchJson<{ message: ChatMessage }>(`/api/chat/conversations/${selectedConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    }),
    onSuccess: async () => {
      setMessageBody("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversationId] }),
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
      ]);
    },
    onError: (error: Error) => toast.error(error.message)
  });

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    const body = messageBody.trim();
    if (!body || sendMessage.isPending || !selectedConversationId) return;
    sendMessage.mutate(body);
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <section className="grid min-h-[640px] overflow-hidden rounded-2xl border border-line bg-white shadow-soft dark:bg-panel md:grid-cols-[minmax(260px,360px)_1fr]">
      <aside className={`${selectedConversationId ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-line`}>
        <div className="space-y-3 border-b border-line p-4">
          <NewConversationDialog onCreated={setSelectedConversationId} />
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden /><Input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search chats" className="pl-9" /></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversationsQuery.isLoading ? <p className="p-4 text-sm text-muted">Loading conversations...</p> : visibleConversations.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => setSelectedConversationId(conversation.id)} className={`mb-1 flex w-full gap-3 rounded-xl p-3 text-left transition ${conversation.id === selectedConversationId ? "bg-brandSoft ring-1 ring-brand/10" : "hover:bg-surface"}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{conversation.type === "GROUP" ? <Users className="h-5 w-5" aria-hidden /> : initials(conversation.title)}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink">{conversation.title}</span><span className="shrink-0 text-[11px] text-muted">{conversation.lastMessage ? shortTime(conversation.lastMessage.createdAt) : ""}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-muted">{conversation.lastMessage ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.body}` : "No messages yet"}</span>{conversation.unreadCount ? <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount}</span> : null}</span></span>
            </button>
          ))}
          {!conversationsQuery.isLoading && !visibleConversations.length ? <div className="p-6 text-center"><MessageSquarePlus className="mx-auto h-7 w-7 text-muted" aria-hidden /><p className="mt-2 text-sm font-semibold text-ink">No conversations yet</p><p className="mt-1 text-xs text-muted">Start a direct or group chat.</p></div> : null}
        </div>
      </aside>

      <div className={`${selectedConversationId ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
        {selectedConversation ? (
          <>
            <header className="flex min-h-[73px] items-center gap-3 border-b border-line px-4 py-3">
              <button type="button" onClick={() => setSelectedConversationId(undefined)} className="rounded-lg p-2 text-muted hover:bg-surface md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" aria-hidden /></button>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{selectedConversation.type === "GROUP" ? <Users className="h-5 w-5" aria-hidden /> : initials(selectedConversation.title)}</span>
              <div className="min-w-0"><h2 className="truncate font-semibold text-ink">{selectedConversation.title}</h2><p className="truncate text-xs text-muted">{selectedConversation.type === "GROUP" ? `${selectedConversation.members.length} members` : selectedConversation.members.filter((member) => member.id !== currentUser.id).map((member) => member.jobTitle).filter(Boolean).join(", ") || "Direct conversation"}</p></div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-surface/40 px-3 py-4 sm:px-6">
              {messagesQuery.hasNextPage ? <div className="mb-4 text-center"><Button type="button" variant="secondary" disabled={messagesQuery.isFetchingNextPage} onClick={() => messagesQuery.fetchNextPage()}>{messagesQuery.isFetchingNextPage ? "Loading..." : "Load earlier messages"}</Button></div> : null}
              {messagesQuery.isLoading ? <p className="text-center text-sm text-muted">Loading messages...</p> : messages.map((message) => (
                <div key={message.id} className={`mb-3 flex ${message.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${message.mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-line bg-white text-ink dark:bg-panel"}`}>
                    {!message.mine && selectedConversation.type === "GROUP" ? <p className="mb-1 text-xs font-semibold text-brand">{message.sender.name}</p> : null}
                    <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                    <p className={`mt-1 text-[10px] ${message.mine ? "text-blue-100" : "text-muted"}`}>{messageTime(message.createdAt)}</p>
                  </div>
                </div>
              ))}
              {!messagesQuery.isLoading && !messages.length ? <div className="flex min-h-80 flex-col items-center justify-center text-center"><MessageSquarePlus className="h-9 w-9 text-muted" aria-hidden /><p className="mt-3 font-semibold text-ink">Start the conversation</p><p className="mt-1 text-sm text-muted">Messages sent here are visible to conversation members.</p></div> : null}
              <div ref={messageEndRef} />
            </div>
            <form ref={formRef} onSubmit={submitMessage} className="flex items-end gap-2 border-t border-line bg-white p-3 dark:bg-panel sm:p-4">
              <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} onKeyDown={handleMessageKeyDown} placeholder="Write a message" rows={2} maxLength={4000} disabled={sendMessage.isPending} className="min-h-[48px] resize-none" />
              <Button type="submit" disabled={!messageBody.trim() || sendMessage.isPending} className="h-12 w-12 shrink-0 px-0" aria-label="Send message"><Send className="h-4 w-4" aria-hidden /></Button>
            </form>
          </>
        ) : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageSquarePlus className="h-10 w-10 text-muted" aria-hidden /><h2 className="mt-3 font-semibold text-ink">Your conversations</h2><p className="mt-1 max-w-sm text-sm text-muted">Select a conversation or start a new direct or group chat.</p></div>}
      </div>
    </section>
  );
}
