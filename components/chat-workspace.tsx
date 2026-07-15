"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, MessageSquarePlus, Paperclip, Pencil, Search, Send, Settings, Smile, Trash2, Users, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "@/lib/toast";
import { Button, Dialog, DialogClose, DialogContent, DialogTrigger, Input, Textarea } from "@/components/ui";

type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  everyone: boolean;
  canManage: boolean;
  updatedAt: string;
  unreadCount: number;
  members: { id: string; name: string; jobTitle?: string | null; active: boolean; online: boolean; lastSeenAt?: string | null }[];
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
  edited: boolean;
  sender: { id: string; name: string };
  attachments: { id: string; fileName: string; mimeType: string; size: number; url: string }[];
  reactions: { emoji: string; count: number; mine: boolean; names: string[] }[];
  readBy: string[];
};

type MessagePage = { messages: ChatMessage[]; hasMore: boolean; typingMembers: string[] };
type SearchResult = { id: string; conversationId: string; conversationTitle: string; body: string; senderName: string; createdAt: string };

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

function fileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageSearchDialog({ onSelect }: { onSelect: (conversationId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const searchQuery = useQuery({
    queryKey: ["chat-search", deferredQuery],
    queryFn: () => fetchJson<{ results: SearchResult[] }>(`/api/chat/search?q=${encodeURIComponent(deferredQuery)}`),
    enabled: open && deferredQuery.length >= 2
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" variant="secondary" className="w-full"><Search className="h-4 w-4" aria-hidden />Search messages</Button></DialogTrigger>
      <DialogContent title="Search messages" description="Search across every conversation you belong to.">
        <div className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter at least two characters" className="pl-9" /></div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {searchQuery.isFetching ? <p className="p-3 text-sm text-muted">Searching...</p> : null}
            {searchQuery.data?.results.map((result) => (
              <button key={result.id} type="button" onClick={() => { onSelect(result.conversationId); setOpen(false); }} className="w-full rounded-xl border border-line p-3 text-left transition hover:bg-surface">
                <span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-ink">{result.conversationTitle}</span><span className="shrink-0 text-xs text-muted">{shortTime(result.createdAt)}</span></span>
                <span className="mt-1 block text-xs font-medium text-brand">{result.senderName}</span>
                <span className="mt-1 block line-clamp-2 text-sm text-muted">{result.body}</span>
              </button>
            ))}
            {deferredQuery.length >= 2 && !searchQuery.isFetching && !searchQuery.data?.results.length ? <p className="p-4 text-center text-sm text-muted">No matching messages.</p> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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

function ManageConversationDialog({ conversation, currentUserId }: { conversation: Conversation; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(conversation.title);
  const [memberIds, setMemberIds] = useState(conversation.members.filter((member) => member.id !== currentUserId).map((member) => member.id));
  const { data } = useQuery({
    queryKey: ["chat-users"],
    queryFn: () => fetchJson<{ users: ChatUser[] }>("/api/chat/users"),
    enabled: open,
    staleTime: 60_000
  });
  const updateGroup = useMutation({
    mutationFn: () => fetchJson(`/api/chat/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, memberIds })
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setOpen(false);
      toast.success("Group updated");
    },
    onError: (error: Error) => toast.error(error.message)
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) {
        setName(conversation.title);
        setMemberIds(conversation.members.filter((member) => member.id !== currentUserId).map((member) => member.id));
      }
    }}>
      <DialogTrigger asChild><button type="button" className="ml-auto rounded-lg p-2 text-muted hover:bg-surface" aria-label="Manage group"><Settings className="h-4 w-4" aria-hidden /></button></DialogTrigger>
      <DialogContent title="Manage group" description="Rename the group and update its members.">
        <div className="space-y-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Group name" maxLength={100} />
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {(data?.users || []).map((user) => {
              const selected = memberIds.includes(user.id);
              return <button key={user.id} type="button" onClick={() => setMemberIds((current) => selected ? current.filter((id) => id !== user.id) : [...current, user.id])} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left ${selected ? "bg-brandSoft" : "hover:bg-surface"}`}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{initials(`${user.firstName} ${user.lastName}`)}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{user.firstName} {user.lastName}</span><span className={`h-4 w-4 rounded-full border-2 ${selected ? "border-brand bg-brand" : "border-line"}`} /></button>;
            })}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="button" disabled={name.trim().length < 2 || !memberIds.length || updateGroup.isPending} onClick={() => updateGroup.mutate()}>{updateGroup.isPending ? "Saving..." : "Save group"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChatWorkspace({ currentUser }: { currentUser: { id: string; name: string } }) {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [messageBody, setMessageBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSignalRef = useRef(0);
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
  const typingMembers = messagesQuery.data?.pages[0]?.typingMembers || [];

  useEffect(() => {
    const heartbeat = () => fetch("/api/chat/presence", { method: "POST" }).catch(() => undefined);
    heartbeat();
    const timer = window.setInterval(heartbeat, 30_000);
    window.addEventListener("focus", heartbeat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", heartbeat);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId || !messages.length) return;
    queryClient.setQueryData<{ conversations: Conversation[] }>(["chat-conversations"], (current) => current ? {
      conversations: current.conversations.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, unreadCount: 0 } : conversation)
    } : current);
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, queryClient, selectedConversationId]);

  const sendMessage = useMutation({
    mutationFn: ({ body, selectedFiles }: { body: string; selectedFiles: File[] }) => {
      const formData = new FormData();
      formData.set("body", body);
      selectedFiles.forEach((file) => formData.append("files", file));
      return fetchJson<{ message: ChatMessage }>(`/api/chat/conversations/${selectedConversationId}/messages`, { method: "POST", body: formData });
    },
    onSuccess: async () => {
      setMessageBody("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (selectedConversationId) fetch(`/api/chat/conversations/${selectedConversationId}/typing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ typing: false }) }).catch(() => undefined);
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
    if ((!body && !files.length) || sendMessage.isPending || !selectedConversationId) return;
    sendMessage.mutate({ body, selectedFiles: files });
  }

  function updateMessageBody(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessageBody(event.target.value);
    if (!selectedConversationId || Date.now() - lastTypingSignalRef.current < 2_000) return;
    lastTypingSignalRef.current = Date.now();
    fetch(`/api/chat/conversations/${selectedConversationId}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing: true })
    }).catch(() => undefined);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      toast.error("Each attachment must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFiles(selectedFiles.slice(0, 5));
  }

  async function editMessage(message: ChatMessage) {
    const nextBody = window.prompt("Edit message", message.body)?.trim();
    if (!nextBody || nextBody === message.body) return;
    try {
      await fetchJson(`/api/chat/conversations/${selectedConversationId}/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: nextBody })
      });
      await queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversationId] });
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await fetchJson(`/api/chat/conversations/${selectedConversationId}/messages/${message.id}`, { method: "DELETE" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversationId] }),
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
      ]);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    try {
      await fetchJson(`/api/chat/conversations/${selectedConversationId}/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji })
      });
      await queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversationId] });
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <section className="grid h-[calc(100dvh-6.5rem)] min-h-[420px] overflow-hidden rounded-2xl border border-line bg-white shadow-soft dark:bg-panel md:h-auto md:min-h-[640px] md:grid-cols-[minmax(260px,360px)_1fr]">
      <aside className={`${selectedConversationId ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-line`}>
        <div className="space-y-3 border-b border-line p-4">
          <NewConversationDialog onCreated={setSelectedConversationId} />
          <MessageSearchDialog onSelect={setSelectedConversationId} />
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
              <button type="button" onClick={() => setSelectedConversationId(undefined)} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" aria-hidden /></button>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{selectedConversation.type === "GROUP" ? <Users className="h-5 w-5" aria-hidden /> : initials(selectedConversation.title)}</span>
              <div className="min-w-0"><h2 className="truncate font-semibold text-ink">{selectedConversation.title}</h2><p className="truncate text-xs text-muted">{selectedConversation.everyone ? "Organization-wide conversation" : selectedConversation.type === "GROUP" ? `${selectedConversation.members.length} members · ${selectedConversation.members.filter((member) => member.online).length} online` : selectedConversation.members.filter((member) => member.id !== currentUser.id).map((member) => member.online ? "Online" : member.lastSeenAt ? `Last seen ${shortTime(member.lastSeenAt)}` : member.jobTitle || "Offline").join(", ") || "Direct conversation"}</p></div>
              {selectedConversation.canManage ? <ManageConversationDialog conversation={selectedConversation} currentUserId={currentUser.id} /> : null}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-surface/40 px-3 py-4 sm:px-6">
              {messagesQuery.hasNextPage ? <div className="mb-4 text-center"><Button type="button" variant="secondary" disabled={messagesQuery.isFetchingNextPage} onClick={() => messagesQuery.fetchNextPage()}>{messagesQuery.isFetchingNextPage ? "Loading..." : "Load earlier messages"}</Button></div> : null}
              {messagesQuery.isLoading ? <p className="text-center text-sm text-muted">Loading messages...</p> : messages.map((message) => (
                <div key={message.id} className={`mb-3 flex ${message.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${message.mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-line bg-white text-ink dark:bg-panel"}`}>
                    {!message.mine && selectedConversation.type === "GROUP" ? <p className="mb-1 text-xs font-semibold text-brand">{message.sender.name}</p> : null}
                    {message.body ? <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p> : null}
                    {message.attachments.length ? <div className="mt-2 space-y-2">{message.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left ${message.mine ? "border-white/20 bg-white/10 text-white" : "border-line bg-surface text-ink"}`}>
                        <FileText className="h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{attachment.fileName}</span><span className={`block text-[10px] ${message.mine ? "text-blue-100" : "text-muted"}`}>{fileSize(attachment.size)}</span></span>
                      </a>
                    ))}</div> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {message.reactions.map((reaction) => <button key={reaction.emoji} type="button" title={reaction.names.join(", ")} onClick={() => toggleReaction(message.id, reaction.emoji)} className={`focus-ring min-h-11 rounded-full px-3 text-xs ring-1 ${reaction.mine ? "bg-amber-100 text-amber-900 ring-amber-300" : message.mine ? "bg-white/10 text-white ring-white/20" : "bg-surface text-ink ring-line"}`}>{reaction.emoji} {reaction.count}</button>)}
                      <details className="relative"><summary className={`focus-ring flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full ${message.mine ? "text-blue-100 hover:bg-white/10" : "text-muted hover:bg-surface"}`} aria-label="React to message"><Smile className="h-4 w-4" aria-hidden /></summary><div className={`absolute bottom-12 z-10 flex rounded-full border border-line bg-white p-1 shadow-lg ${message.mine ? "right-0" : "left-0"}`}>{["👍", "❤️", "😂", "🎉", "👀", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={() => toggleReaction(message.id, emoji)} className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-base hover:bg-surface">{emoji}</button>)}</div></details>
                      {message.mine ? <><button type="button" onClick={() => editMessage(message)} className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-blue-100 hover:bg-white/10" aria-label="Edit message"><Pencil className="h-4 w-4" aria-hidden /></button><button type="button" onClick={() => deleteMessage(message)} className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-blue-100 hover:bg-white/10" aria-label="Delete message"><Trash2 className="h-4 w-4" aria-hidden /></button></> : null}
                    </div>
                    <p className={`mt-1 text-[10px] ${message.mine ? "text-blue-100" : "text-muted"}`}>{messageTime(message.createdAt)}{message.edited ? " · edited" : ""}</p>
                    {message.mine && message.readBy.length ? <p className="mt-0.5 max-w-64 truncate text-right text-[10px] text-blue-100" title={message.readBy.join(", ")}>Seen by {message.readBy.join(", ")}</p> : null}
                  </div>
                </div>
              ))}
              {!messagesQuery.isLoading && !messages.length ? <div className="flex min-h-80 flex-col items-center justify-center text-center"><MessageSquarePlus className="h-9 w-9 text-muted" aria-hidden /><p className="mt-3 font-semibold text-ink">Start the conversation</p><p className="mt-1 text-sm text-muted">Messages sent here are visible to conversation members.</p></div> : null}
              <div ref={messageEndRef} />
            </div>
            <div className="border-t border-line bg-white dark:bg-panel">
              {typingMembers.length ? <p className="px-4 pt-2 text-xs font-medium text-brand">{typingMembers.join(", ")} {typingMembers.length === 1 ? "is" : "are"} typing...</p> : null}
              {files.length ? <div className="flex flex-wrap gap-2 px-4 pt-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-ink"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`}><X className="h-3 w-3" aria-hidden /></button></span>)}</div> : null}
              <form ref={formRef} onSubmit={submitMessage} className="flex items-end gap-2 p-3 sm:p-4">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={selectFiles} accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" />
                <Button type="button" variant="secondary" disabled={sendMessage.isPending} className="h-12 w-12 shrink-0 px-0 max-[420px]:w-12" aria-label="Attach files" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" aria-hidden /></Button>
                <Textarea value={messageBody} onChange={updateMessageBody} onKeyDown={handleMessageKeyDown} placeholder="Write a message" rows={2} maxLength={4000} disabled={sendMessage.isPending} className="min-h-[48px] resize-none" />
                <Button type="submit" disabled={(!messageBody.trim() && !files.length) || sendMessage.isPending} className="h-12 w-12 shrink-0 px-0 max-[420px]:w-12" aria-label="Send message"><Send className="h-4 w-4" aria-hidden /></Button>
              </form>
            </div>
          </>
        ) : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageSquarePlus className="h-10 w-10 text-muted" aria-hidden /><h2 className="mt-3 font-semibold text-ink">Your conversations</h2><p className="mt-1 max-w-sm text-sm text-muted">Select a conversation or start a new direct or group chat.</p></div>}
      </div>
    </section>
  );
}
