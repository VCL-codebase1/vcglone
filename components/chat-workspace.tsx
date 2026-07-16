"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Archive, ArrowDown, ArrowLeft, AtSign, BellOff, CheckCheck, Copy, FileText, Info, Loader2, MessageSquarePlus, MoreHorizontal, Paperclip, Pencil, Pin, Reply, RotateCcw, Search, Send, Settings, Smile, Trash2, Users, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent as ReactClipboardEvent, type DragEvent as ReactDragEvent, type FormEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { toast } from "@/lib/toast";
import { Button, Dialog, DialogClose, DialogContent, DialogTrigger, Input, Sheet, SheetContent, Textarea } from "@/components/ui";

type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  everyone: boolean;
  canManage: boolean;
  updatedAt: string;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
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
  replyTo?: { id: string; body: string; sender: { id: string; name: string } } | null;
  attachments: { id: string; fileName: string; mimeType: string; size: number; url: string }[];
  reactions: { emoji: string; count: number; mine: boolean; names: string[] }[];
  readBy: string[];
};

type PendingMessage = ChatMessage & {
  delivery: "sending" | "failed";
  pendingFiles: File[];
  conversationId: string;
};

type MessagePage = { messages: ChatMessage[]; hasMore: boolean; typingMembers: string[]; firstUnreadMessageId?: string | null };
type SearchResult = { id: string; conversationId: string; conversationTitle: string; body: string; senderName: string; createdAt: string };
type ConversationFilter = "ALL" | "UNREAD" | "DIRECT" | "GROUPS" | "ARCHIVED";
type ConversationPreference = { pinned?: boolean; muted?: boolean; archived?: boolean };

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

function messageText(body: string) {
  return body.split(/(@[\w.-]+)/g).map((part, index) => part.startsWith("@")
    ? <span key={`${part}-${index}`} className="rounded bg-brand/10 px-0.5 font-semibold text-brand">{part.replace(/_/g, " ")}</span>
    : <Fragment key={`${part}-${index}`}>{part}</Fragment>);
}

function MessageSearchDialog({ onSelect, conversationId, buttonLabel = "Search messages" }: { onSelect: (conversationId: string, messageId: string) => void; conversationId?: string; buttonLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const searchQuery = useQuery({
    queryKey: ["chat-search", conversationId || "all", deferredQuery],
    queryFn: () => fetchJson<{ results: SearchResult[] }>(`/api/chat/search?q=${encodeURIComponent(deferredQuery)}${conversationId ? `&conversation=${encodeURIComponent(conversationId)}` : ""}`),
    enabled: open && deferredQuery.length >= 2
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button type="button" className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-muted transition hover:bg-surface hover:text-brand dark:bg-panel" aria-label={buttonLabel} title={buttonLabel}><Search className="h-4 w-4" aria-hidden /></button></DialogTrigger>
      <DialogContent title={conversationId ? "Search this conversation" : "Search messages"} description={conversationId ? "Find messages in the current conversation." : "Search across every conversation you belong to."}>
        <div className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter at least two characters" className="pl-9" /></div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {searchQuery.isFetching ? <p className="p-3 text-sm text-muted">Searching...</p> : null}
            {searchQuery.data?.results.map((result) => (
              <button key={result.id} type="button" onClick={() => { onSelect(result.conversationId, result.id); setOpen(false); }} className="w-full rounded-xl border border-line p-3 text-left transition hover:bg-surface">
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
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("ALL");
  const [conversationPreferences, setConversationPreferences] = useState<Record<string, ConversationPreference>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<{ message: ChatMessage; x: number; y: number } | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);
  const [messageActionPending, setMessageActionPending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSignalRef = useRef(0);
  const initialConversationHandledRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const nearBottomRef = useRef(true);
  const loadingEarlierRef = useRef(false);
  const scrollForOwnMessageRef = useRef(false);
  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => fetchJson<{ conversations: Conversation[] }>("/api/chat/conversations"),
    refetchInterval: 5_000
  });
  const conversations = useMemo(() => conversationsQuery.data?.conversations || [], [conversationsQuery.data?.conversations]);
  const visibleConversations = useMemo(() => conversations.filter((conversation) => {
    const preference = conversationPreferences[conversation.id];
    const matchesSearch = conversation.title.toLowerCase().includes(conversationSearch.trim().toLowerCase());
    const matchesArchive = conversationFilter === "ARCHIVED" ? preference?.archived : !preference?.archived;
    const matchesFilter = conversationFilter === "ALL"
      || conversationFilter === "ARCHIVED"
      || (conversationFilter === "UNREAD" && conversation.unreadCount > 0)
      || (conversationFilter === "DIRECT" && conversation.type === "DIRECT")
      || (conversationFilter === "GROUPS" && conversation.type === "GROUP");
    return matchesSearch && matchesArchive && matchesFilter;
  }).sort((first, second) => {
    const firstPinned = conversationPreferences[first.id]?.pinned ? 1 : 0;
    const secondPinned = conversationPreferences[second.id]?.pinned ? 1 : 0;
    if (firstPinned !== secondPinned) return secondPinned - firstPinned;
    return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
  }), [conversationFilter, conversationPreferences, conversationSearch, conversations]);
  const totalUnread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId);
  const mentionQuery = messageBody.match(/(?:^|\s)@([^\s@]*)$/)?.[1]?.toLowerCase();
  const mentionSuggestions = mentionQuery !== undefined && selectedConversation?.type === "GROUP"
    ? selectedConversation.members.filter((member) => member.id !== currentUser.id && member.name.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  const draftKey = useCallback((conversationId: string) => `vcglone-chat-draft:${currentUser.id}:${conversationId}`, [currentUser.id]);

  const showConversation = useCallback((conversationId?: string, messageId?: string) => {
    if (selectedConversationId && messageBody.trim()) {
      window.localStorage.setItem(draftKey(selectedConversationId), messageBody);
    }
    setSelectedConversationId(conversationId);
    setMessageBody(conversationId ? window.localStorage.getItem(draftKey(conversationId)) || "" : "");
    setFiles([]);
    setReplyingTo(null);
    setEmojiOpen(false);
    setDetailsOpen(false);
    setNewMessageCount(0);
    setFirstUnreadMessageId(null);
    setHighlightedMessageId(messageId || null);
    nearBottomRef.current = true;
    previousMessageCountRef.current = 0;
  }, [draftKey, messageBody, selectedConversationId]);

  const selectConversation = useCallback((conversationId: string, messageId?: string) => {
    const url = new URL(window.location.href);
    const alreadySelectedInHistory = url.searchParams.get("conversation") === conversationId;
    showConversation(conversationId, messageId);
    if (alreadySelectedInHistory) return;
    url.searchParams.set("conversation", conversationId);
    const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    window.history.pushState({ ...currentState, vcgloneChatConversation: conversationId }, "", url);
  }, [showConversation]);

  function closeConversation() {
    showConversation(undefined);
    if (selectedConversationId && window.history.state?.vcgloneChatConversation === selectedConversationId) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("conversation");
    const currentState = window.history.state && typeof window.history.state === "object" ? { ...window.history.state } : {};
    delete currentState.vcgloneChatConversation;
    window.history.replaceState(currentState, "", url);
  }

  useEffect(() => {
    const syncConversationFromHistory = () => {
      const conversationId = new URLSearchParams(window.location.search).get("conversation");
      showConversation(conversationId && conversations.some((conversation) => conversation.id === conversationId) ? conversationId : undefined);
    };
    window.addEventListener("popstate", syncConversationFromHistory);
    return () => window.removeEventListener("popstate", syncConversationFromHistory);
  }, [conversations, showConversation]);

  useEffect(() => {
    setConversationPreferences(Object.fromEntries(conversations.map((conversation) => [conversation.id, {
      pinned: conversation.pinned,
      muted: conversation.muted,
      archived: conversation.archived
    }])));
  }, [conversations]);

  useEffect(() => {
    if (!conversations.length) return;
    setDrafts(Object.fromEntries(conversations.map((conversation) => [conversation.id, window.localStorage.getItem(draftKey(conversation.id)) || ""])));
  }, [conversations, draftKey]);

  useEffect(() => {
    if (!selectedConversationId) return;
    const timer = window.setTimeout(() => {
      if (messageBody.trim()) window.localStorage.setItem(draftKey(selectedConversationId), messageBody);
      else window.localStorage.removeItem(draftKey(selectedConversationId));
      setDrafts((current) => ({ ...current, [selectedConversationId]: messageBody }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftKey, messageBody, selectedConversationId]);

  function updateConversationPreference(conversationId: string, update: Partial<ConversationPreference>) {
    const previous = conversationPreferences[conversationId] || {};
    setConversationPreferences((current) => ({ ...current, [conversationId]: { ...previous, ...update } }));
    fetchJson(`/api/chat/conversations/${conversationId}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update)
    }).then(() => queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })).catch((error: Error) => {
      setConversationPreferences((current) => ({ ...current, [conversationId]: previous }));
      toast.error(error.message);
    });
  }

  useEffect(() => {
    if (initialConversationHandledRef.current || !conversations.length) return;
    initialConversationHandledRef.current = true;
    const conversationId = new URLSearchParams(window.location.search).get("conversation");
    if (conversationId && conversations.some((conversation) => conversation.id === conversationId)) {
      selectConversation(conversationId);
    }
  }, [conversations, selectConversation]);

  const messagesQuery = useInfiniteQuery({
    queryKey: ["chat-messages", selectedConversationId],
    queryFn: ({ pageParam }) => fetchJson<MessagePage>(`/api/chat/conversations/${selectedConversationId}/messages${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ""}`),
    enabled: Boolean(selectedConversationId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.messages[0]?.createdAt : undefined,
    refetchInterval: 3_000
  });
  const messages = useMemo(() => (messagesQuery.data?.pages || []).slice().reverse().flatMap((page) => page.messages), [messagesQuery.data?.pages]);
  const visibleMessages = useMemo(() => [
    ...messages,
    ...pendingMessages.filter((message) => message.conversationId === selectedConversationId)
  ], [messages, pendingMessages, selectedConversationId]);
  const typingMembers = messagesQuery.data?.pages[0]?.typingMembers || [];

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messageEndRef.current?.scrollIntoView({ behavior, block: "end" });
    nearBottomRef.current = true;
    setNewMessageCount(0);
  }, []);

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
  }, [messages.length, queryClient, selectedConversationId]);

  useEffect(() => {
    const unreadId = messagesQuery.data?.pages[0]?.firstUnreadMessageId;
    if (unreadId && !firstUnreadMessageId) setFirstUnreadMessageId(unreadId);
  }, [firstUnreadMessageId, messagesQuery.data?.pages]);

  useEffect(() => {
    if (!selectedConversationId || !visibleMessages.length) return;
    const previousCount = previousMessageCountRef.current;
    const addedCount = Math.max(0, visibleMessages.length - previousCount);
    previousMessageCountRef.current = visibleMessages.length;
    if (loadingEarlierRef.current) return;
    if (previousCount === 0 || nearBottomRef.current || scrollForOwnMessageRef.current) {
      scrollForOwnMessageRef.current = false;
      window.requestAnimationFrame(() => scrollToBottom(previousCount === 0 ? "auto" : "smooth"));
    } else if (addedCount > 0) {
      setNewMessageCount((current) => current + addedCount);
    }
  }, [scrollToBottom, selectedConversationId, visibleMessages.length]);

  useEffect(() => {
    if (!highlightedMessageId || !messages.some((message) => message.id === highlightedMessageId)) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`chat-message-${highlightedMessageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => setHighlightedMessageId(null), 2_500);
    });
  }, [highlightedMessageId, messages]);

  useEffect(() => {
    if (!messageMenu) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setMessageMenu(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [messageMenu]);

  function handleMessageScroll() {
    const container = messageScrollRef.current;
    if (!container) return;
    nearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottomRef.current) setNewMessageCount(0);
  }

  async function loadEarlierMessages() {
    const container = messageScrollRef.current;
    if (!container) return;
    const previousHeight = container.scrollHeight;
    loadingEarlierRef.current = true;
    await messagesQuery.fetchNextPage();
    window.requestAnimationFrame(() => {
      container.scrollTop += container.scrollHeight - previousHeight;
      loadingEarlierRef.current = false;
      previousMessageCountRef.current = container.querySelectorAll("[data-chat-message]").length;
    });
  }

  const sendMessage = useMutation({
    mutationFn: ({ conversationId, body, selectedFiles, replyToId }: { tempId: string; conversationId: string; body: string; selectedFiles: File[]; replyToId?: string }) => {
      const formData = new FormData();
      formData.set("body", body);
      if (replyToId) formData.set("replyToId", replyToId);
      selectedFiles.forEach((file) => formData.append("files", file));
      return fetchJson<{ message: ChatMessage }>(`/api/chat/conversations/${conversationId}/messages`, { method: "POST", body: formData });
    },
    onSuccess: async ({ message }, variables) => {
      setPendingMessages((current) => {
        current.find((pending) => pending.id === variables.tempId)?.attachments.forEach((attachment) => {
          if (attachment.url.startsWith("blob:")) URL.revokeObjectURL(attachment.url);
        });
        return current.filter((pending) => pending.id !== variables.tempId);
      });
      queryClient.setQueryData<InfiniteData<MessagePage>>(["chat-messages", variables.conversationId], (current) => {
        if (!current || current.pages[0]?.messages.some((item) => item.id === message.id)) return current;
        return { ...current, pages: current.pages.map((page, index) => index === 0 ? { ...page, messages: [...page.messages, message] } : page) };
      });
      await queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error: Error, variables) => {
      setPendingMessages((current) => current.map((pending) => pending.id === variables.tempId ? { ...pending, delivery: "failed" } : pending));
      toast.error(error.message);
    }
  });

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    const body = messageBody.trim();
    if ((!body && !files.length) || !selectedConversationId) return;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const selectedFiles = [...files];
    const pendingMessage: PendingMessage = {
      id: tempId,
      conversationId: selectedConversationId,
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mine: true,
      edited: false,
      sender: { id: currentUser.id, name: currentUser.name },
      replyTo: replyingTo ? { id: replyingTo.id, body: replyingTo.body, sender: replyingTo.sender } : null,
      attachments: selectedFiles.map((file, index) => ({ id: `${tempId}-${index}`, fileName: file.name, mimeType: file.type, size: file.size, url: URL.createObjectURL(file) })),
      reactions: [],
      readBy: [],
      delivery: "sending",
      pendingFiles: selectedFiles
    };
    setPendingMessages((current) => [...current, pendingMessage]);
    setMessageBody("");
    setFiles([]);
    setReplyingTo(null);
    setEmojiOpen(false);
    window.localStorage.removeItem(draftKey(selectedConversationId));
    setDrafts((current) => ({ ...current, [selectedConversationId]: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetch(`/api/chat/conversations/${selectedConversationId}/typing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ typing: false }) }).catch(() => undefined);
    scrollForOwnMessageRef.current = true;
    sendMessage.mutate({ tempId, conversationId: selectedConversationId, body, selectedFiles, replyToId: replyingTo?.id });
  }

  function retryPendingMessage(message: PendingMessage) {
    setPendingMessages((current) => current.map((pending) => pending.id === message.id ? { ...pending, delivery: "sending" } : pending));
    scrollForOwnMessageRef.current = true;
    sendMessage.mutate({ tempId: message.id, conversationId: message.conversationId, body: message.body, selectedFiles: message.pendingFiles, replyToId: message.replyTo?.id });
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

  function addFiles(nextFiles: File[]) {
    const validFiles = nextFiles.filter((file) => file.size <= 5 * 1024 * 1024);
    if (validFiles.length !== nextFiles.length) toast.error("Each attachment must be 5 MB or smaller.");
    setFiles((current) => {
      const combined = [...current, ...validFiles].filter((file, index, all) => all.findIndex((item) => item.name === file.name && item.size === file.size) === index);
      if (combined.length > 5) toast.warning("You can attach up to five files at once.");
      return combined.slice(0, 5);
    });
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function handleComposerPaste(event: ReactClipboardEvent<HTMLTextAreaElement>) {
    const pastedFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((item): item is File => Boolean(item));
    if (pastedFiles.length) addFiles(pastedFiles);
  }

  function handleFileDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingFiles(false);
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  function insertEmoji(emoji: string) {
    setMessageBody((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  }

  function insertMention(name: string) {
    setMessageBody((current) => current.replace(/@[^\s@]*$/, `@${name.replace(/\s+/g, "_")} `));
  }

  function startReply(message: ChatMessage) {
    setReplyingTo(message);
    setMessageMenu(null);
    window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("[data-chat-composer]")?.focus());
  }

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.body);
      toast.success("Message copied");
    } catch {
      toast.error("Unable to copy this message.");
    }
    setMessageMenu(null);
  }

  function openMessageActions(event: ReactMouseEvent<HTMLButtonElement>, message: ChatMessage) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = 288;
    const x = Math.max(12, Math.min(window.innerWidth - width - 12, message.mine ? bounds.right - width : bounds.left));
    const y = Math.max(12, Math.min(window.innerHeight - 220, bounds.top > 230 ? bounds.top - 190 : bounds.bottom + 8));
    setMessageMenu({ message, x, y });
  }

  function handleSearchSelect(conversationId: string, messageId: string) {
    selectConversation(conversationId, messageId);
    window.setTimeout(() => {
      if (!document.getElementById(`chat-message-${messageId}`)) toast.info("Open earlier messages to reach this search result.");
    }, 600);
  }

  function jumpToMessage(messageId: string) {
    if (!document.getElementById(`chat-message-${messageId}`)) {
      toast.info("Open earlier messages to view the original message.");
      return;
    }
    setHighlightedMessageId(messageId);
  }

  function openEditMessage(message: ChatMessage) {
    setMessageMenu(null);
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
    } else if (event.key === "Escape") {
      setReplyingTo(null);
      setEmojiOpen(false);
    }
  }

  return (
    <>
    <section
      className="relative -mx-3 -my-5 grid h-[calc(100dvh_-_4.75rem_-_env(safe-area-inset-top))] min-h-0 overflow-hidden border-y border-line bg-white shadow-[0_20px_60px_rgba(23,32,51,0.09)] dark:bg-panel sm:mx-0 sm:my-0 sm:h-[calc(100dvh_-_6.5rem_-_env(safe-area-inset-top))] sm:rounded-2xl sm:border md:h-[calc(100dvh_-_13rem_-_env(safe-area-inset-top))] md:max-h-[900px] lg:h-[calc(100dvh-13rem)] lg:min-h-[640px] lg:grid-cols-[minmax(300px,360px)_1fr]"
      onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingFiles(false); }}
      onDrop={handleFileDrop}
    >
      {isDraggingFiles && selectedConversationId ? <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-brandSoft/95 backdrop-blur"><div className="text-center"><Paperclip className="mx-auto h-8 w-8 text-brand" aria-hidden /><p className="mt-2 font-semibold text-brand">Drop files to attach</p><p className="mt-1 text-xs text-muted">Up to five files, 5 MB each</p></div></div> : null}
      <aside className={`${selectedConversationId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-line bg-white dark:bg-panel`}>
        <div className="border-b border-line bg-white/95 p-3.5 backdrop-blur dark:bg-panel/95 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold tracking-tight text-ink">Chats</h2><p className="text-xs text-muted">{totalUnread ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}` : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}</p></div>
            <div className="flex items-center gap-2"><MessageSearchDialog onSelect={handleSearchSelect} /><NewConversationDialog onCreated={(conversationId) => selectConversation(conversationId)} /></div>
          </div>
          <div className="relative mt-3"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" aria-hidden /><Input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search chats" className="rounded-full border-transparent bg-surface pl-10 shadow-none focus:border-brand/20 focus:bg-white dark:focus:bg-panel" /></div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
            {(["ALL", "UNREAD", "DIRECT", "GROUPS", "ARCHIVED"] as const).map((filter) => (
              <button key={filter} type="button" onClick={() => setConversationFilter(filter)} className={`focus-ring min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold transition ${conversationFilter === filter ? "bg-brand text-white shadow-sm" : "bg-surface text-muted hover:bg-brandSoft hover:text-brand"}`}>{filter === "ALL" ? "All" : filter === "UNREAD" ? `Unread${totalUnread ? ` ${totalUnread}` : ""}` : filter === "DIRECT" ? "Direct" : filter === "GROUPS" ? "Groups" : "Archived"}</button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversationsQuery.isLoading ? <div className="space-y-1 p-2">{[1, 2, 3].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-xl bg-surface" />)}</div> : visibleConversations.map((conversation) => {
            const peerOnline = conversation.type === "DIRECT" && conversation.members.some((member) => member.id !== currentUser.id && member.online);
            const preference = conversationPreferences[conversation.id];
            const draft = drafts[conversation.id]?.trim();
            return <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={`flex w-full gap-3 border-b border-line/60 px-3.5 py-3 text-left transition sm:px-4 ${conversation.id === selectedConversationId ? "bg-brandSoft/80" : "hover:bg-surface/80"}`}>
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-blue-500 text-sm font-bold text-white shadow-sm">{conversation.type === "GROUP" ? <Users className="h-5 w-5" aria-hidden /> : initials(conversation.title)}{peerOnline ? <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-panel" aria-label="Online" /> : null}</span>
              <span className="min-w-0 flex-1 self-center"><span className="flex items-center justify-between gap-2"><span className={`flex min-w-0 items-center gap-1.5 truncate text-[15px] text-ink ${conversation.unreadCount ? "font-bold" : "font-semibold"}`}><span className="truncate">{conversation.title}</span>{preference?.pinned ? <Pin className="h-3 w-3 shrink-0 fill-brand text-brand" aria-label="Pinned" /> : null}{preference?.muted ? <BellOff className="h-3 w-3 shrink-0 text-muted" aria-label="Muted" /> : null}</span><span className={`shrink-0 text-[11px] font-medium ${conversation.unreadCount ? "text-brand" : "text-muted"}`}>{conversation.lastMessage ? shortTime(conversation.lastMessage.createdAt) : ""}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className={`truncate text-[13px] ${draft ? "font-semibold text-brand" : conversation.unreadCount ? "font-semibold text-ink" : "text-muted"}`}>{draft ? `Draft: ${draft}` : conversation.lastMessage ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.body || "Attachment"}` : "Start the conversation"}</span>{conversation.unreadCount ? <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span> : null}</span></span>
            </button>;
          })}
          {!conversationsQuery.isLoading && !visibleConversations.length ? <div className="mx-3 mt-8 rounded-2xl border border-dashed border-line bg-surface/70 p-6 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brandSoft text-brand"><MessageSquarePlus className="h-5 w-5" aria-hidden /></span><p className="mt-3 text-sm font-semibold text-ink">No chats found</p><p className="mt-1 text-xs text-muted">Try another search, change the filter, or start a new chat.</p></div> : null}
        </div>
      </aside>

      <div className={`${selectedConversationId ? "flex" : "hidden lg:flex"} relative min-h-0 flex-col bg-white dark:bg-panel`}>
        {selectedConversation ? (
          <>
            <header className="flex min-h-[68px] items-center gap-3 border-b border-line bg-white/95 px-2.5 py-2.5 backdrop-blur dark:bg-panel/95 sm:px-5">
              <button type="button" onClick={closeConversation} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-brand lg:hidden" aria-label="Back to chats"><ArrowLeft className="h-5 w-5" aria-hidden /></button>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-blue-500 text-xs font-bold text-white shadow-sm">{selectedConversation.type === "GROUP" ? <Users className="h-5 w-5" aria-hidden /> : initials(selectedConversation.title)}</span>
              <div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-ink">{selectedConversation.title}</h2><p className="mt-0.5 truncate text-xs text-muted">{selectedConversation.everyone ? "Everyone at VCGL" : selectedConversation.type === "GROUP" ? `${selectedConversation.members.length} members · ${selectedConversation.members.filter((member) => member.online).length} online` : selectedConversation.members.filter((member) => member.id !== currentUser.id).map((member) => member.online ? "Online now" : member.lastSeenAt ? `Last seen ${shortTime(member.lastSeenAt)}` : member.jobTitle || "Offline").join(", ") || "Direct conversation"}</p></div>
              <MessageSearchDialog onSelect={handleSearchSelect} conversationId={selectedConversation.id} buttonLabel="Search this conversation" />
              <button type="button" onClick={() => setDetailsOpen(true)} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted transition hover:bg-surface hover:text-brand dark:bg-panel" aria-label="Conversation details" title="Conversation details"><Info className="h-4 w-4" aria-hidden /></button>
              {selectedConversation.canManage ? <ManageConversationDialog conversation={selectedConversation} currentUserId={currentUser.id} /> : null}
            </header>
            <div ref={messageScrollRef} onScroll={handleMessageScroll} className="relative min-h-0 flex-1 overflow-y-auto bg-[#f3f6f9] px-3 py-3 dark:bg-[#111827] sm:px-6 sm:py-5">
              {messagesQuery.hasNextPage ? <div className="mb-5 text-center"><button type="button" disabled={messagesQuery.isFetchingNextPage} onClick={() => void loadEarlierMessages()} className="focus-ring rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-brand shadow-sm transition hover:bg-brandSoft disabled:opacity-60 dark:bg-panel">{messagesQuery.isFetchingNextPage ? "Loading..." : "Load earlier messages"}</button></div> : null}
              {messagesQuery.isLoading ? <div className="flex min-h-60 items-center justify-center"><p className="rounded-full bg-white px-4 py-2 text-sm text-muted shadow-sm dark:bg-panel">Loading messages...</p></div> : visibleMessages.map((message, index) => {
                const pendingMessage = "delivery" in message ? message as PendingMessage : null;
                const previous = visibleMessages[index - 1];
                const startsNewDay = !previous || !sameMessageDay(previous.createdAt, message.createdAt);
                const grouped = Boolean(previous && !startsNewDay && previous.sender.id === message.sender.id && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000);
                return <Fragment key={message.id}>
                  {startsNewDay ? <div className="sticky top-2 z-10 my-5 flex justify-center pointer-events-none"><span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted shadow-sm ring-1 ring-line/60 backdrop-blur dark:bg-panel/90">{messageDay(message.createdAt)}</span></div> : null}
                  {firstUnreadMessageId === message.id ? <div className="my-5 flex items-center gap-3" aria-label="Unread messages"><span className="h-px flex-1 bg-brand/30" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand">New messages</span><span className="h-px flex-1 bg-brand/30" /></div> : null}
                  <div id={`chat-message-${message.id}`} data-chat-message className={`group flex items-end gap-2 rounded-xl transition-colors ${highlightedMessageId === message.id ? "bg-amber-100/70 ring-4 ring-amber-100/70" : ""} ${message.mine ? "justify-end" : "justify-start"} ${grouped ? "mt-1" : "mt-3"}`}>
                    {!message.mine && selectedConversation.type === "GROUP" ? grouped ? <span className="w-8 shrink-0" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand shadow-sm ring-1 ring-line dark:bg-panel">{initials(message.sender.name)}</span> : null}
                    <div className={`flex min-w-0 flex-col sm:max-w-[74%] lg:max-w-[68%] ${!message.mine && selectedConversation.type === "GROUP" ? "max-w-[70%]" : "max-w-[84%]"} ${message.mine ? "items-end" : "items-start"}`}>
                      {!message.mine && selectedConversation.type === "GROUP" && !grouped ? <p className="mb-1 px-1 text-[11px] font-semibold text-brand">{message.sender.name}</p> : null}
                      <div className="relative min-w-0">
                        <div className={`min-w-0 rounded-2xl px-3 py-2 shadow-sm sm:px-3.5 ${message.mine ? "rounded-br-md bg-[#dcecff] text-slate-900 dark:bg-[#193a68] dark:text-white" : "rounded-bl-md bg-white text-ink ring-1 ring-line/70 dark:bg-panel"}`}>
                          {message.replyTo ? <button type="button" onClick={() => jumpToMessage(message.replyTo!.id)} className="mb-2 block w-full min-w-0 rounded-lg border-l-2 border-brand bg-black/5 px-2.5 py-2 text-left transition hover:bg-black/10"><span className="block truncate text-[11px] font-semibold text-brand">{message.replyTo.sender.name}</span><span className="mt-0.5 block truncate text-xs opacity-70">{message.replyTo.body || "Attachment"}</span></button> : null}
                          {message.body ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{messageText(message.body)}</p> : null}
                          {message.attachments.length ? <div className={`${message.body ? "mt-2" : ""} space-y-2`}>{message.attachments.map((attachment) => attachment.mimeType.startsWith("image/") ? (
                            <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-black/5">
                              <Image src={attachment.url} alt={attachment.fileName} width={420} height={280} unoptimized className="max-h-72 w-full object-cover" />
                              <span className="flex items-center justify-between gap-3 px-2.5 py-2 text-[10px]"><span className="truncate font-semibold">{attachment.fileName}</span><span className="shrink-0 opacity-60">{fileSize(attachment.size)}</span></span>
                            </a>
                          ) : (
                            <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex min-w-48 items-center gap-2 rounded-xl bg-black/5 px-3 py-2.5 text-left transition hover:bg-black/10"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-sm dark:bg-panel"><FileText className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{attachment.fileName}</span><span className="block text-[10px] opacity-60">{fileSize(attachment.size)}</span></span></a>
                          ))}</div> : null}
                          <div className="mt-1 flex items-center justify-end gap-1 pl-8 text-[10px] opacity-65">
                            {message.edited ? <span>edited</span> : null}
                            <span>{messageTime(message.createdAt)}</span>
                            {pendingMessage?.delivery === "sending" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /><span>Sending</span></> : pendingMessage?.delivery === "failed" ? <button type="button" onClick={() => retryPendingMessage(pendingMessage)} className="inline-flex items-center gap-1 font-semibold text-danger"><RotateCcw className="h-3 w-3" aria-hidden />Retry</button> : message.mine ? <CheckCheck className={`h-3.5 w-3.5 ${message.readBy.length ? "text-sky-600 dark:text-sky-300" : "text-slate-400"}`} aria-label={message.readBy.length ? `Seen by ${message.readBy.join(", ")}` : "Sent"} /> : null}
                          </div>
                        </div>
                        {!pendingMessage ? <button type="button" onClick={(event) => openMessageActions(event, message)} className={`focus-ring absolute top-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-muted opacity-70 shadow-sm backdrop-blur transition hover:bg-white hover:text-brand sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 dark:bg-panel/80 ${message.mine ? "-left-11 sm:-left-9" : "-right-11 sm:-right-9"}`} aria-label="Message actions"><MoreHorizontal className="h-4 w-4" aria-hidden /></button> : null}
                      </div>
                      {message.reactions.length ? <div className={`relative z-10 -mt-1 flex flex-wrap gap-1 ${message.mine ? "justify-end pr-2" : "justify-start pl-2"}`}>{message.reactions.map((reaction) => <button key={reaction.emoji} type="button" title={reaction.names.join(", ")} onClick={() => toggleReaction(message.id, reaction.emoji)} className={`focus-ring min-h-10 rounded-full border px-2 text-[11px] shadow-sm transition hover:-translate-y-0.5 ${reaction.mine ? "border-amber-300 bg-amber-100 text-amber-900" : "border-line bg-white text-ink hover:bg-surface dark:bg-panel"}`}>{reaction.emoji} {reaction.count}</button>)}</div> : null}
                    </div>
                  </div>
                </Fragment>;
              })}
              {!messagesQuery.isLoading && !messages.length ? <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-brandSoft text-brand ring-8 ring-white dark:ring-panel"><MessageSquarePlus className="h-7 w-7" aria-hidden /></span><p className="mt-5 font-semibold text-ink">Start the conversation</p><p className="mt-1 max-w-sm text-sm text-muted">Share an update, ask a question, or attach a file.</p></div> : null}
              <div ref={messageEndRef} />
            </div>
            {newMessageCount > 0 ? <button type="button" onClick={() => scrollToBottom()} className="focus-ring absolute bottom-24 right-4 z-20 inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_32px_rgba(16,43,116,0.28)] transition hover:-translate-y-0.5 sm:right-6"><ArrowDown className="h-4 w-4" aria-hidden />{newMessageCount} new message{newMessageCount === 1 ? "" : "s"}</button> : null}
            <div className="relative border-t border-line bg-[#f3f6f9] px-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-1.5 dark:bg-[#111827] sm:px-5 sm:pb-3">
              <div className="min-h-5 px-1 text-xs font-medium text-brand" aria-live="polite">{typingMembers.length ? `${typingMembers.join(", ")} ${typingMembers.length === 1 ? "is" : "are"} typing...` : drafts[selectedConversation.id]?.trim() ? "Draft saved" : ""}</div>
              {replyingTo ? <div className="mb-2 flex items-start gap-3 rounded-xl border-l-4 border-brand bg-white px-3 py-2 shadow-sm dark:bg-panel"><Reply className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-brand">Replying to {replyingTo.sender.name}</p><p className="mt-0.5 truncate text-xs text-muted">{replyingTo.body || "Attachment"}</p></div><button type="button" onClick={() => setReplyingTo(null)} className="focus-ring rounded-full p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Cancel reply"><X className="h-3.5 w-3.5" aria-hidden /></button></div> : null}
              {files.length ? <div className="mb-2 flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink"><FileText className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden /><span className="max-w-48 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="focus-ring flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-white hover:text-danger" aria-label={`Remove ${file.name}`}><X className="h-3 w-3" aria-hidden /></button></span>)}</div> : null}
              {mentionSuggestions.length ? <div className="absolute bottom-[calc(100%-1.5rem)] left-3 z-30 w-[min(20rem,calc(100%-1.5rem))] overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_16px_44px_rgba(23,32,51,0.18)] dark:bg-panel"><p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Mention someone</p>{mentionSuggestions.map((member) => <button key={member.id} type="button" onClick={() => insertMention(member.name)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-surface"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brandSoft text-[10px] font-bold text-brand">{initials(member.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{member.name}</span><span className="block truncate text-xs text-muted">{member.jobTitle || (member.online ? "Online" : "Member")}</span></span></button>)}</div> : null}
              {emojiOpen ? <div className="absolute bottom-[calc(100%-1.5rem)] left-3 z-30 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-line bg-white p-2 shadow-[0_16px_44px_rgba(23,32,51,0.18)] dark:bg-panel">{["😀", "😁", "😂", "😊", "😍", "👍", "👏", "🙏", "🎉", "❤️", "🔥", "✅", "👀", "💡", "📌", "💯", "🤝", "🙌", "😅", "🤔", "😢", "😮", "🚀", "✨"].map((emoji) => <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="focus-ring flex h-9 items-center justify-center rounded-lg text-lg transition hover:bg-surface">{emoji}</button>)}</div> : null}
              <form ref={formRef} onSubmit={submitMessage}>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={selectFiles} accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" />
                <div className="flex items-end gap-1.5 rounded-[1.6rem] border border-line bg-white p-1.5 shadow-[0_8px_24px_rgba(23,32,51,0.08)] transition focus-within:border-brand/30 focus-within:ring-2 focus-within:ring-brand/10 dark:bg-panel">
                  <button type="button" className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-brand" aria-label="Attach files" title="Attach files" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-5 w-5" aria-hidden /></button>
                  <button type="button" onClick={() => setEmojiOpen((open) => !open)} className={`focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-surface hover:text-brand ${emojiOpen ? "bg-brandSoft text-brand" : "text-muted"}`} aria-label="Choose emoji" title="Emoji"><Smile className="h-5 w-5" aria-hidden /></button>
                  {selectedConversation.type === "GROUP" ? <button type="button" onClick={() => setMessageBody((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@`)} className="focus-ring hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-brand sm:flex" aria-label="Mention someone" title="Mention"><AtSign className="h-5 w-5" aria-hidden /></button> : null}
                  <Textarea data-chat-composer value={messageBody} onChange={updateMessageBody} onPaste={handleComposerPaste} onKeyDown={handleMessageKeyDown} placeholder={`Message ${selectedConversation.title}`} rows={1} maxLength={4000} className="max-h-32 min-h-10 border-0 bg-transparent px-1 py-2.5 shadow-none focus:border-transparent focus:bg-transparent dark:bg-transparent dark:focus:bg-transparent" />
                  <button type="submit" disabled={!messageBody.trim() && !files.length} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:scale-105 hover:bg-[#0b1f56] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100" aria-label="Send message"><Send className="h-4 w-4" aria-hidden /></button>
                </div>
                <p className="mt-1 hidden px-3 text-[10px] text-muted sm:block">Enter to send · Shift + Enter for a new line · Paste or drop files to attach</p>
              </form>
            </div>
          </>
        ) : <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(16,43,116,0.06),transparent_22rem)] p-8 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brandSoft text-brand"><MessageSquarePlus className="h-7 w-7" aria-hidden /></span><h2 className="mt-5 text-lg font-semibold text-ink">Your conversations</h2><p className="mt-1 max-w-sm text-sm text-muted">Choose a conversation from the list or start a new chat with a colleague.</p></div>}
      </div>
    </section>

    {selectedConversation ? (
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent title="Conversation details" className="w-[min(28rem,calc(100vw-1rem))]">
          <div className="space-y-5">
            <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-brandSoft to-white p-5 text-center dark:from-brand/20 dark:to-panel">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-blue-500 text-lg font-bold text-white shadow-sm">{selectedConversation.type === "GROUP" ? <Users className="h-7 w-7" aria-hidden /> : initials(selectedConversation.title)}</span>
              <h3 className="mt-3 font-semibold text-ink">{selectedConversation.title}</h3>
              <p className="mt-1 text-sm text-muted">{selectedConversation.type === "GROUP" ? `${selectedConversation.members.length} members` : "Direct conversation"}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => updateConversationPreference(selectedConversation.id, { pinned: !conversationPreferences[selectedConversation.id]?.pinned })} className={`focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${conversationPreferences[selectedConversation.id]?.pinned ? "border-brand/30 bg-brandSoft text-brand" : "border-line bg-white text-muted hover:bg-surface hover:text-ink dark:bg-panel"}`}><Pin className={`h-5 w-5 ${conversationPreferences[selectedConversation.id]?.pinned ? "fill-brand" : ""}`} aria-hidden />{conversationPreferences[selectedConversation.id]?.pinned ? "Unpin" : "Pin"}</button>
              <button type="button" onClick={() => updateConversationPreference(selectedConversation.id, { muted: !conversationPreferences[selectedConversation.id]?.muted })} className={`focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${conversationPreferences[selectedConversation.id]?.muted ? "border-brand/30 bg-brandSoft text-brand" : "border-line bg-white text-muted hover:bg-surface hover:text-ink dark:bg-panel"}`}><BellOff className="h-5 w-5" aria-hidden />{conversationPreferences[selectedConversation.id]?.muted ? "Unmute" : "Mute"}</button>
              <button type="button" onClick={() => { const willArchive = !conversationPreferences[selectedConversation.id]?.archived; updateConversationPreference(selectedConversation.id, { archived: willArchive }); if (willArchive) closeConversation(); else setDetailsOpen(false); }} className={`focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${conversationPreferences[selectedConversation.id]?.archived ? "border-brand/30 bg-brandSoft text-brand" : "border-line bg-white text-muted hover:bg-surface hover:text-ink dark:bg-panel"}`}><Archive className="h-5 w-5" aria-hidden />{conversationPreferences[selectedConversation.id]?.archived ? "Restore" : "Archive"}</button>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">Members</h3><span className="text-xs text-muted">{selectedConversation.members.filter((member) => member.online).length} online</span></div>
              <div className="mt-2 divide-y divide-line rounded-2xl border border-line">
                {selectedConversation.members.map((member) => <div key={member.id} className="flex items-center gap-3 p-3"><span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brandSoft text-xs font-bold text-brand">{initials(member.name)}{member.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-panel" /> : null}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{member.name}{member.id === currentUser.id ? " (You)" : ""}</span><span className="block truncate text-xs text-muted">{member.online ? "Online now" : member.jobTitle || "Offline"}</span></span></div>)}
              </div>
            </div>
            <p className="rounded-xl bg-surface p-3 text-xs leading-relaxed text-muted">Pin, mute, and archive preferences follow your account. Muted conversations will not create message notifications.</p>
          </div>
        </SheetContent>
      </Sheet>
    ) : null}

    {messageMenu ? (
      <>
        <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={() => setMessageMenu(null)} aria-label="Close message actions" />
        <div className="fixed z-50 w-72 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_18px_54px_rgba(23,32,51,0.24)] dark:bg-panel" style={{ left: messageMenu.x, top: messageMenu.y }} role="menu" aria-label="Message actions">
          <div className="grid grid-cols-6 gap-0.5">{["👍", "❤️", "😂", "🎉", "👀", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={() => { void toggleReaction(messageMenu.message.id, emoji); setMessageMenu(null); }} className="focus-ring flex h-10 items-center justify-center rounded-xl text-base transition hover:bg-surface" aria-label={`React ${emoji}`}>{emoji}</button>)}</div>
          <div className="mt-1 grid grid-cols-2 gap-1 border-t border-line pt-1">
            <button type="button" onClick={() => startReply(messageMenu.message)} className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-ink transition hover:bg-surface"><Reply className="h-3.5 w-3.5" aria-hidden />Reply</button>
            <button type="button" onClick={() => void copyMessage(messageMenu.message)} disabled={!messageMenu.message.body} className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-ink transition hover:bg-surface disabled:opacity-40"><Copy className="h-3.5 w-3.5" aria-hidden />Copy</button>
          </div>
          {messageMenu.message.mine ? <div className="mt-1 grid grid-cols-2 gap-1 border-t border-line pt-1"><button type="button" onClick={() => openEditMessage(messageMenu.message)} disabled={!messageMenu.message.body} className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-ink transition hover:bg-surface disabled:opacity-40"><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button><button type="button" onClick={() => { setDeletingMessage(messageMenu.message); setMessageMenu(null); }} className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-danger transition hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</button></div> : null}
        </div>
      </>
    ) : null}

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
