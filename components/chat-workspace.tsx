"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, MessageSquarePlus, MoreHorizontal, Paperclip, Pencil, Search, Send, Settings, Smile, Trash2, Users, X } from "lucide-react";
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
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
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function messageDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function sameMessageDay(first: string, second: string) {
  return new Date(first).toDateString() === new Date(second).toDateString();
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
      <DialogTrigger asChild><button type="button" className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-muted transition hover:bg-surface hover:text-brand dark:bg-panel" aria-label="Search messages" title="Search messages"><Search className="h-4 w-4" aria-hidden /></button></DialogTrigger>
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
      <DialogTrigger asChild><button type="button" className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-[0_8px_20px_rgba(16,43,116,0.2)] transition hover:bg-[#0b1f56]" aria-label="Start a new chat" title="New chat"><MessageSquarePlus className="h-4 w-4" aria-hidden /></button></DialogTrigger>
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
      <DialogTrigger asChild><button type="button" className="focus-ring ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-brand" aria-label="Manage group" title="Manage group"><Settings className="h-4 w-4" aria-hidden /></button></DialogTrigger>
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
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);
  const [messageActionPending, setMessageActionPending] = useState(false);
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

  function openEditMessage(message: ChatMessage) {
    setEditingMessage(message);
    setEditBody(message.body);
  }

  async function saveEditedMessage() {
    const nextBody = editBody.trim();
    if (!editingMessage || !nextBody || nextBody === editingMessage.body) return;
    setMessageActionPending(true);
    try {
      await fetchJson(`/api/chat/conversations/${selectedConversationId}/messages/${editingMessage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: nextBody })
      });
      await queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversationId] });
      setEditingMessage(null);
      toast.success("Message updated");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setMessageActionPending(false);
    }
  }

  async function confirmDeleteMessage() {
    if (!deletingMessage) return;
    setMessageActionPending(true);
    try {
      await fetchJson(`/api/chat/conversations/${selectedConversationId}/messages/${deletingMessage.id}`, { method: "DELETE" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversationId] }),
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
      ]);
      setDeletingMessage(null);
      toast.success("Message deleted");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setMessageActionPending(false);
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
    <>
    <section className="grid h-[calc(100dvh-6.5rem)] min-h-[420px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_rgba(23,32,51,0.09)] dark:bg-panel md:h-[calc(100dvh-13rem)] md:min-h-[640px] md:max-h-[900px] md:grid-cols-[minmax(280px,340px)_1fr]">
      <aside className={`${selectedConversationId ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-line bg-surface/40`}>
        <div className="border-b border-line bg-white/90 p-4 backdrop-blur dark:bg-panel/90">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold tracking-tight text-ink">Messages</h2><p className="text-xs text-muted">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</p></div>
            <div className="flex items-center gap-2"><MessageSearchDialog onSelect={setSelectedConversationId} /><NewConversationDialog onCreated={setSelectedConversationId} /></div>
          </div>
          <div className="relative mt-4"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" aria-hidden /><Input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search conversations" className="rounded-xl bg-surface pl-10 shadow-none" /></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          {conversationsQuery.isLoading ? <div className="space-y-2 p-1">{[1, 2, 3].map((item) => <div key={item} className="h-[72px] animate-pulse rounded-xl bg-white/80 dark:bg-panel" />)}</div> : visibleConversations.map((conversation) => {
            const peerOnline = conversation.type === "DIRECT" && conversation.members.some((member) => member.id !== currentUser.id && member.online);
            return <button key={conversation.id} type="button" onClick={() => setSelectedConversationId(conversation.id)} className={`mb-1 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition ${conversation.id === selectedConversationId ? "bg-white shadow-[0_8px_24px_rgba(23,32,51,0.07)] ring-1 ring-brand/10 dark:bg-panel" : "hover:bg-white/80 dark:hover:bg-panel/70"}`}>
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/70 text-sm font-bold text-white shadow-sm">{conversation.type === "GROUP" ? <Users className="h-5 w-5" aria-hidden /> : initials(conversation.title)}{peerOnline ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-panel" aria-label="Online" /> : null}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className={`truncate text-sm text-ink ${conversation.unreadCount ? "font-bold" : "font-semibold"}`}>{conversation.title}</span><span className="shrink-0 text-[10px] font-medium text-muted">{conversation.lastMessage ? shortTime(conversation.lastMessage.createdAt) : ""}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className={`truncate text-xs ${conversation.unreadCount ? "font-semibold text-ink" : "text-muted"}`}>{conversation.lastMessage ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.body || "Attachment"}` : "Start the conversation"}</span>{conversation.unreadCount ? <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span> : null}</span></span>
            </button>;
          })}
          {!conversationsQuery.isLoading && !visibleConversations.length ? <div className="mx-2 mt-8 rounded-2xl border border-dashed border-line bg-white/70 p-6 text-center dark:bg-panel/70"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brandSoft text-brand"><MessageSquarePlus className="h-5 w-5" aria-hidden /></span><p className="mt-3 text-sm font-semibold text-ink">No conversations found</p><p className="mt-1 text-xs text-muted">Try another search or start a new chat.</p></div> : null}
        </div>
      </aside>

      <div className={`${selectedConversationId ? "flex" : "hidden md:flex"} min-h-0 flex-col bg-white dark:bg-panel`}>
        {selectedConversation ? (
          <>
            <header className="flex min-h-[72px] items-center gap-3 border-b border-line bg-white/95 px-3 py-3 backdrop-blur dark:bg-panel/95 sm:px-5">
              <button type="button" onClick={() => setSelectedConversationId(undefined)} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-brand md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" aria-hidden /></button>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/70 text-xs font-bold text-white shadow-sm">{selectedConversation.type === "GROUP" ? <Users className="h-5 w-5" aria-hidden /> : initials(selectedConversation.title)}</span>
              <div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-ink">{selectedConversation.title}</h2><p className="mt-0.5 truncate text-xs text-muted">{selectedConversation.everyone ? "Everyone at VCGL" : selectedConversation.type === "GROUP" ? `${selectedConversation.members.length} members · ${selectedConversation.members.filter((member) => member.online).length} online` : selectedConversation.members.filter((member) => member.id !== currentUser.id).map((member) => member.online ? "Online now" : member.lastSeenAt ? `Last seen ${shortTime(member.lastSeenAt)}` : member.jobTitle || "Offline").join(", ") || "Direct conversation"}</p></div>
              {selectedConversation.canManage ? <ManageConversationDialog conversation={selectedConversation} currentUserId={currentUser.id} /> : null}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(16,43,116,0.045),transparent_24rem)] px-3 py-4 sm:px-6 sm:py-5">
              {messagesQuery.hasNextPage ? <div className="mb-5 text-center"><button type="button" disabled={messagesQuery.isFetchingNextPage} onClick={() => messagesQuery.fetchNextPage()} className="focus-ring rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-brand shadow-sm transition hover:bg-brandSoft disabled:opacity-60 dark:bg-panel">{messagesQuery.isFetchingNextPage ? "Loading..." : "Load earlier messages"}</button></div> : null}
              {messagesQuery.isLoading ? <div className="flex min-h-60 items-center justify-center"><p className="rounded-full bg-white px-4 py-2 text-sm text-muted shadow-sm dark:bg-panel">Loading messages...</p></div> : messages.map((message, index) => {
                const previous = messages[index - 1];
                const startsNewDay = !previous || !sameMessageDay(previous.createdAt, message.createdAt);
                const grouped = Boolean(previous && !startsNewDay && previous.sender.id === message.sender.id && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000);
                return <Fragment key={message.id}>
                  {startsNewDay ? <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-line/70" /><span className="rounded-full border border-line bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted shadow-sm dark:bg-panel">{messageDay(message.createdAt)}</span><span className="h-px flex-1 bg-line/70" /></div> : null}
                  <div className={`group flex items-end gap-2 ${message.mine ? "justify-end" : "justify-start"} ${grouped ? "mt-1" : "mt-4"}`}>
                    {!message.mine ? grouped ? <span className="w-9 shrink-0" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-brand ring-1 ring-line">{initials(message.sender.name)}</span> : null}
                    <div className={`flex min-w-0 max-w-[82%] flex-col sm:max-w-[72%] lg:max-w-[65%] ${message.mine ? "items-end" : "items-start"}`}>
                      {!message.mine && selectedConversation.type === "GROUP" && !grouped ? <p className="mb-1 px-1 text-[11px] font-semibold text-brand">{message.sender.name}</p> : null}
                      <div className={`min-w-0 rounded-2xl px-3.5 py-2.5 shadow-sm sm:px-4 ${message.mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-line bg-white text-ink dark:bg-panel"}`}>
                        {message.body ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p> : null}
                        {message.attachments.length ? <div className={`${message.body ? "mt-2" : ""} space-y-2`}>{message.attachments.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className={`flex min-w-48 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${message.mine ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-line bg-surface text-ink hover:bg-brandSoft"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${message.mine ? "bg-white/10" : "bg-white text-brand ring-1 ring-line dark:bg-panel"}`}><FileText className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{attachment.fileName}</span><span className={`block text-[10px] ${message.mine ? "text-blue-100" : "text-muted"}`}>{fileSize(attachment.size)}</span></span></a>)}</div> : null}
                      </div>
                      {message.reactions.length ? <div className={`mt-1.5 flex flex-wrap gap-1 ${message.mine ? "justify-end" : "justify-start"}`}>{message.reactions.map((reaction) => <button key={reaction.emoji} type="button" title={reaction.names.join(", ")} onClick={() => toggleReaction(message.id, reaction.emoji)} className={`focus-ring min-h-9 rounded-full border px-2.5 text-xs shadow-sm transition hover:-translate-y-0.5 ${reaction.mine ? "border-amber-300 bg-amber-100 text-amber-900" : "border-line bg-white text-ink hover:bg-surface dark:bg-panel"}`}>{reaction.emoji} {reaction.count}</button>)}</div> : null}
                      <div className={`mt-1 flex min-h-9 items-center gap-1 ${message.mine ? "flex-row-reverse" : "flex-row"}`}>
                        <p className="px-1 text-[10px] text-muted">{messageTime(message.createdAt)}{message.edited ? " · edited" : ""}</p>
                        <div className="flex items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <details className="relative"><summary className="focus-ring flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-brand" aria-label="React to message"><Smile className="h-4 w-4" aria-hidden /></summary><div className={`absolute bottom-10 z-20 flex rounded-full border border-line bg-white p-1 shadow-[0_12px_36px_rgba(23,32,51,0.16)] dark:bg-panel ${message.mine ? "right-0" : "left-0"}`}>{["👍", "❤️", "😂", "🎉", "👀", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); void toggleReaction(message.id, emoji); }} className="focus-ring flex h-10 w-10 items-center justify-center rounded-full text-base transition hover:bg-surface">{emoji}</button>)}</div></details>
                          {message.mine ? <details className="relative"><summary className="focus-ring flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-brand" aria-label="Message options"><MoreHorizontal className="h-4 w-4" aria-hidden /></summary><div className="absolute bottom-10 right-0 z-20 w-36 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_36px_rgba(23,32,51,0.16)] dark:bg-panel"><button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); openEditMessage(message); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-ink transition hover:bg-surface"><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button><button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setDeletingMessage(message); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-danger transition hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</button></div></details> : null}
                        </div>
                      </div>
                      {message.mine && message.readBy.length ? <p className="max-w-64 truncate px-1 text-right text-[10px] text-muted" title={message.readBy.join(", ")}>Seen by {message.readBy.join(", ")}</p> : null}
                    </div>
                  </div>
                </Fragment>;
              })}
              {!messagesQuery.isLoading && !messages.length ? <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-brandSoft text-brand ring-8 ring-white dark:ring-panel"><MessageSquarePlus className="h-7 w-7" aria-hidden /></span><p className="mt-5 font-semibold text-ink">Start the conversation</p><p className="mt-1 max-w-sm text-sm text-muted">Share an update, ask a question, or attach a file.</p></div> : null}
              <div ref={messageEndRef} />
            </div>
            <div className="border-t border-line bg-white px-3 pb-3 pt-2 dark:bg-panel sm:px-5 sm:pb-4">
              <div className="min-h-5 px-1 text-xs font-medium text-brand">{typingMembers.length ? `${typingMembers.join(", ")} ${typingMembers.length === 1 ? "is" : "are"} typing...` : ""}</div>
              {files.length ? <div className="mb-2 flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink"><FileText className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden /><span className="max-w-48 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="focus-ring flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-white hover:text-danger" aria-label={`Remove ${file.name}`}><X className="h-3 w-3" aria-hidden /></button></span>)}</div> : null}
              <form ref={formRef} onSubmit={submitMessage}>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={selectFiles} accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" />
                <div className="flex items-end gap-1.5 rounded-2xl border border-line bg-surface/70 p-1.5 shadow-[0_8px_24px_rgba(23,32,51,0.05)] transition focus-within:border-brand/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/10 dark:focus-within:bg-panel">
                  <button type="button" disabled={sendMessage.isPending} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-white hover:text-brand disabled:opacity-60 dark:hover:bg-panel" aria-label="Attach files" title="Attach files" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" aria-hidden /></button>
                  <Textarea value={messageBody} onChange={updateMessageBody} onKeyDown={handleMessageKeyDown} placeholder="Write a message" rows={1} maxLength={4000} disabled={sendMessage.isPending} className="max-h-32 min-h-10 border-0 bg-transparent px-2 py-2.5 shadow-none focus:border-transparent focus:bg-transparent dark:bg-transparent dark:focus:bg-transparent" />
                  <button type="submit" disabled={(!messageBody.trim() && !files.length) || sendMessage.isPending} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm transition hover:bg-[#0b1f56] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" aria-hidden /></button>
                </div>
                <p className="mt-1.5 hidden px-1 text-[10px] text-muted sm:block">Enter to send · Shift + Enter for a new line</p>
              </form>
            </div>
          </>
        ) : <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(16,43,116,0.06),transparent_22rem)] p-8 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brandSoft text-brand"><MessageSquarePlus className="h-7 w-7" aria-hidden /></span><h2 className="mt-5 text-lg font-semibold text-ink">Your conversations</h2><p className="mt-1 max-w-sm text-sm text-muted">Choose a conversation from the list or start a new chat with a colleague.</p></div>}
      </div>
    </section>

    <Dialog open={Boolean(editingMessage)} onOpenChange={(open) => { if (!open && !messageActionPending) setEditingMessage(null); }}>
      <DialogContent title="Edit message" description="Update the message text. Attachments will remain unchanged.">
        <div className="space-y-4">
          <Textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={5} maxLength={4000} autoFocus className="resize-none" />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={messageActionPending} onClick={() => setEditingMessage(null)}>Cancel</Button><Button type="button" disabled={messageActionPending || !editBody.trim() || editBody.trim() === editingMessage?.body} onClick={saveEditedMessage}>{messageActionPending ? "Saving..." : "Save changes"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(deletingMessage)} onOpenChange={(open) => { if (!open && !messageActionPending) setDeletingMessage(null); }}>
      <DialogContent title="Delete message" description="This removes the message and its attachments for everyone in the conversation.">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">This action cannot be undone.</div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={messageActionPending} onClick={() => setDeletingMessage(null)}>Cancel</Button><Button type="button" variant="danger" disabled={messageActionPending} onClick={confirmDeleteMessage}>{messageActionPending ? "Deleting..." : "Delete message"}</Button></div>
      </DialogContent>
    </Dialog>
    </>
  );
}
