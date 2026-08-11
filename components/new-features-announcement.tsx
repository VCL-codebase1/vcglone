"use client";

import { ArrowRight, BookOpen, ListChecks, MessageSquare, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent } from "@/components/ui";
import { roleChat, roleKnowledgeBase, roleTasks } from "@/lib/routes";

const RELEASE_ID = "2026-08-productivity-tools-v4";

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

function MobileFeatureArtwork() {
  return (
    <div className="relative h-32 overflow-hidden bg-[#e2f3ff]" aria-hidden>
      <span className="absolute left-[12%] top-5 h-3 w-3 rotate-45 rounded-sm bg-white/85" />
      <span className="absolute right-[18%] top-8 h-5 w-5 rotate-45 rounded-md bg-white/70" />
      <Sparkles className="absolute left-[27%] top-4 h-5 w-5 text-brand/30" />

      <div className="absolute -bottom-9 left-1/2 h-28 w-48 -translate-x-1/2 rounded-[1.75rem] bg-[#78b9e1] shadow-[0_18px_38px_rgba(36,58,121,0.14)]">
        <div className="absolute left-1/2 top-[-2.2rem] flex h-[5.2rem] w-[6.6rem] -translate-x-1/2 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-[0_12px_28px_rgba(31,45,89,0.12)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand ring-[7px] ring-[#eff8fe]">
            <Rocket className="h-6 w-6" strokeWidth={1.8} />
          </span>
        </div>
      </div>

      <span className="absolute bottom-4 left-[15%] flex h-10 w-10 -rotate-6 items-center justify-center rounded-xl bg-white text-brand shadow-[0_10px_24px_rgba(31,45,89,0.11)]">
        <MessageSquare className="h-[1.1rem] w-[1.1rem]" />
      </span>
      <span className="absolute bottom-7 right-[13%] flex h-11 w-11 rotate-6 items-center justify-center rounded-xl bg-brand text-white shadow-[0_12px_26px_rgba(36,58,121,0.2)]">
        <ListChecks className="h-5 w-5" />
      </span>
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
      description: "Message coworkers, create groups, and share files.",
      href: chatHref,
      Icon: MessageSquare
    },
    {
      title: "Employee task management",
      description: "Create personal tasks, track deadlines, and submit work for review.",
      href: tasksHref,
      Icon: ListChecks
    },
    {
      title: "Knowledge Base",
      description: "Access company SOPs, policies, rules, and guides from HR.",
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
        className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overscroll-contain rounded-[1.5rem] p-0 sm:max-h-[92vh] sm:w-[calc(100vw-2rem)] sm:rounded-[1.75rem] sm:p-0"
      >
        <div className="grid lg:min-h-[580px] lg:grid-cols-[1.02fr_0.98fr]">
          <section className="lg:hidden">
            <MobileFeatureArtwork />
          </section>

          <section className="flex flex-col p-5 sm:p-9 lg:p-11">
            <div>
              <h2 className="max-w-[17rem] text-[1.35rem] font-semibold leading-[1.18] tracking-tight text-ink sm:max-w-none sm:text-3xl">
                <span className="sm:hidden">Three new ways to work</span>
                <span className="hidden sm:inline">More ways to get work done</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-5 text-muted sm:mt-3 sm:text-base sm:leading-6">
                <span className="sm:hidden">Hi {firstName}, here’s a quick look at the latest tools.</span>
                <span className="hidden sm:inline">Hi {firstName}, chat, employee task management, and the company Knowledge Base are now available.</span>
              </p>
            </div>

            <div className="mt-4 space-y-1 sm:mt-7 sm:space-y-2">
              {features.map(({ title, description, href, Icon }) => (
                <Link
                  key={title}
                  href={href}
                  onClick={rememberDismissal}
                  className="focus-ring group flex items-center gap-3 rounded-xl px-2 py-2.5 transition duration-200 hover:bg-[#f4f8fc] active:scale-[0.99] sm:items-start sm:rounded-2xl sm:p-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brandSoft text-brand transition group-hover:bg-[#d5ebfb] sm:h-11 sm:w-11 sm:rounded-2xl">
                    <Icon className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink sm:text-base">{title}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand sm:h-4 sm:w-4" aria-hidden />
                    </span>
                    <span className="mt-0.5 block text-xs leading-[1.1rem] text-muted sm:mt-1 sm:text-sm sm:leading-5">{description}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-5 sm:pt-7">
              <Button asChild className="min-h-10 w-full px-4 py-2 sm:min-h-11 sm:px-5 sm:py-2.5">
                <Link href={chatHref} onClick={rememberDismissal}>Open chat</Link>
              </Button>
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
