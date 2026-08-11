"use client";

import { ArrowRight, BookOpen, ListChecks, MessageSquare, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent } from "@/components/ui";
import { roleChat, roleKnowledgeBase, roleTasks } from "@/lib/routes";

const RELEASE_ID = "2026-08-productivity-tools-v1";

function announcementKey(userId: string) {
  return `vcglone:announcement:${RELEASE_ID}:${userId}`;
}

function FeatureIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden>
      <span className="absolute left-[12%] top-[14%] h-4 w-4 rotate-45 rounded-sm bg-white/80" />
      <span className="absolute right-[12%] top-[20%] h-7 w-7 rotate-45 rounded-md bg-white/70" />
      <span className="absolute right-[8%] top-[55%] h-3 w-3 rotate-45 rounded-sm bg-brand/20" />

      <div className="absolute inset-x-[12%] bottom-[10%] h-[42%] rounded-[2rem] bg-[#78b9e1] shadow-[0_24px_50px_rgba(36,58,121,0.14)]">
        <div className="absolute inset-x-[14%] -top-[44%] flex aspect-[1.35] items-center justify-center rounded-[1.75rem] border border-white/80 bg-white shadow-[0_18px_45px_rgba(31,45,89,0.14)]">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brandSoft text-brand ring-[14px] ring-[#eff8fe]">
            <Rocket className="h-11 w-11" strokeWidth={1.7} />
          </span>
        </div>
        <div className="absolute inset-x-[13%] bottom-[12%] h-2 rounded-full bg-white/45" />
      </div>

      <div className="absolute left-[4%] top-[39%] flex h-16 w-16 -rotate-6 items-center justify-center rounded-2xl bg-white text-brand shadow-[0_14px_32px_rgba(31,45,89,0.12)]">
        <MessageSquare className="h-7 w-7" />
      </div>
      <div className="absolute right-[2%] top-[34%] flex h-20 w-20 rotate-6 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_16px_36px_rgba(36,58,121,0.22)]">
        <ListChecks className="h-8 w-8" />
      </div>
      <div className="absolute right-[7%] bottom-[5%] flex h-16 w-16 -rotate-3 items-center justify-center rounded-2xl bg-white text-brand shadow-[0_14px_32px_rgba(31,45,89,0.12)]">
        <BookOpen className="h-7 w-7" />
      </div>
      <Sparkles className="absolute left-[20%] top-[6%] h-8 w-8 text-brand/35" />
    </div>
  );
}

export function NewFeaturesAnnouncement({
  userId,
  firstName,
  role
}: {
  userId: string;
  firstName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const chatHref = roleChat(role);
  const tasksHref = roleTasks(role);
  const knowledgeHref = roleKnowledgeBase(role);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(announcementKey(userId)) === "seen";
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }
    if (seen) return undefined;

    const timer = window.setTimeout(() => setOpen(true), 650);
    return () => window.clearTimeout(timer);
  }, [userId]);

  function rememberDismissal() {
    try {
      window.localStorage.setItem(announcementKey(userId), "seen");
    } catch {
      // The dialog still closes when storage is unavailable.
    }
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) rememberDismissal();
    else setOpen(true);
  }

  const features = [
    {
      title: "Team chat",
      description: "Send direct messages, create group conversations, and share files with coworkers.",
      href: chatHref,
      Icon: MessageSquare
    },
    {
      title: "Employee task management",
      description: "Employees can create tasks, manage deadlines, and submit completed work for review.",
      href: tasksHref,
      Icon: ListChecks
    },
    {
      title: "Knowledge Base",
      description: "Find company SOPs, policies, rules, guides, and other documents published by HR.",
      href: knowledgeHref,
      Icon: BookOpen
    }
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="New tools are now available"
        description="An announcement for chat, employee task management, and the company Knowledge Base."
        visuallyHiddenHeader
        className="max-h-[92vh] max-w-5xl overflow-hidden p-0 sm:p-0"
      >
        <div className="grid lg:min-h-[610px] lg:grid-cols-[1.02fr_0.98fr]">
          <section className="flex flex-col p-6 sm:p-9 lg:p-11">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brandSoft px-3 py-1.5 text-xs font-semibold text-brand">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                New in vcglOne
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">More ways to get work done</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                Hi {firstName}, chat, employee task management, and the company Knowledge Base are now available.
              </p>
            </div>

            <div className="mt-7 space-y-2">
              {features.map(({ title, description, href, Icon }) => (
                <Link
                  key={title}
                  href={href}
                  onClick={rememberDismissal}
                  className="focus-ring group flex items-start gap-3 rounded-2xl p-3 transition hover:bg-[#f4f8fc]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brandSoft text-brand transition group-hover:bg-[#d5ebfb]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ink">{title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{description}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-auto grid gap-2 pt-7 sm:grid-cols-2">
              <Button asChild>
                <Link href={chatHref} onClick={rememberDismissal}>Start with chat</Link>
              </Button>
              <Button type="button" variant="secondary" onClick={rememberDismissal}>Got it</Button>
            </div>
          </section>

          <section className="hidden items-center justify-center overflow-hidden bg-[#e2f3ff] p-8 lg:flex">
            <FeatureIllustration />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
