"use client";

import { CakeSlice, Gift, MessageSquare, PartyPopper, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogContent } from "@/components/ui";
import { roleChat } from "@/lib/routes";

type Celebrant = {
  id: string;
  firstName: string;
  lastName: string;
  department: string | null;
};

function initials(person: Celebrant) {
  return `${person.firstName[0] || ""}${person.lastName[0] || ""}`.toUpperCase();
}

function BirthdayArtwork() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[430px]" aria-hidden>
      <span className="absolute left-[9%] top-[15%] h-3 w-3 rotate-12 rounded-sm bg-[#f7c96f]" />
      <span className="absolute left-[24%] top-[7%] h-2 w-5 -rotate-12 rounded-full bg-brand/25" />
      <span className="absolute right-[16%] top-[13%] h-5 w-2 rotate-[24deg] rounded-full bg-[#ef9d9d]" />
      <span className="absolute right-[8%] top-[42%] h-3 w-3 rotate-45 rounded-sm bg-[#8dc7e8]" />
      <span className="absolute bottom-[12%] left-[8%] h-5 w-2 -rotate-[24deg] rounded-full bg-[#ef9d9d]" />
      <Sparkles className="absolute left-[10%] top-[37%] h-8 w-8 text-brand/30" />

      <div className="absolute left-[7%] top-[22%] h-28 w-20 -rotate-6 rounded-[50%] bg-[#f5c85d] shadow-[0_18px_36px_rgba(31,45,89,0.1)]">
        <span className="absolute bottom-[-3.4rem] left-1/2 h-14 w-px -translate-x-1/2 bg-brand/25" />
      </div>
      <div className="absolute right-[6%] top-[28%] h-24 w-16 rotate-6 rounded-[50%] bg-[#8dc7e8] shadow-[0_18px_36px_rgba(31,45,89,0.1)]">
        <span className="absolute bottom-[-3.1rem] left-1/2 h-12 w-px -translate-x-1/2 bg-brand/25" />
      </div>

      <div className="absolute inset-x-[18%] bottom-[12%] h-[47%] rounded-[2rem] bg-[#9bcceb] shadow-[0_24px_48px_rgba(36,58,121,0.14)]">
        <div className="absolute left-1/2 top-[-31%] flex h-36 w-44 -translate-x-1/2 flex-col items-center justify-end rounded-[1.5rem] bg-white pb-5 shadow-[0_18px_42px_rgba(31,45,89,0.14)]">
          <span className="absolute left-1/2 top-[-2.8rem] flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-[#fff5d9] text-[#b67811] ring-[10px] ring-white">
            <CakeSlice className="h-9 w-9" strokeWidth={1.7} />
          </span>
          <div className="flex gap-2">
            <span className="h-2 w-16 rounded-full bg-brandSoft" />
            <span className="h-2 w-6 rounded-full bg-[#f7d996]" />
          </div>
          <span className="mt-3 h-2 w-24 rounded-full bg-surface" />
        </div>
        <div className="absolute inset-x-[15%] bottom-[13%] h-2 rounded-full bg-white/55" />
      </div>

      <span className="absolute bottom-[5%] right-[12%] flex h-16 w-16 rotate-6 items-center justify-center rounded-2xl bg-white text-[#b67811] shadow-[0_14px_32px_rgba(31,45,89,0.12)]">
        <Gift className="h-7 w-7" />
      </span>
      <PartyPopper className="absolute right-[19%] top-[7%] h-9 w-9 text-brand/40" />
    </div>
  );
}

function MobileBirthdayArtwork() {
  return (
    <div className="relative h-36 overflow-hidden bg-[#e7f5ff]" aria-hidden>
      <span className="absolute left-[13%] top-6 h-3 w-3 rotate-12 rounded-sm bg-[#f5c85d]" />
      <span className="absolute right-[14%] top-8 h-4 w-2 rotate-[24deg] rounded-full bg-[#ef9d9d]" />
      <Sparkles className="absolute left-[28%] top-4 h-5 w-5 text-brand/30" />
      <PartyPopper className="absolute right-[26%] top-4 h-6 w-6 text-brand/35" />

      <div className="absolute -bottom-12 left-1/2 h-32 w-52 -translate-x-1/2 rounded-[2rem] bg-[#91c8e9] shadow-[0_18px_38px_rgba(36,58,121,0.14)]">
        <div className="absolute left-1/2 top-[-2.65rem] flex h-[5.8rem] w-[7rem] -translate-x-1/2 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-[0_12px_28px_rgba(31,45,89,0.12)]">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff5d9] text-[#b67811] ring-[7px] ring-[#fffaf0]">
            <CakeSlice className="h-7 w-7" strokeWidth={1.8} />
          </span>
        </div>
      </div>

      <span className="absolute bottom-5 left-[14%] flex h-10 w-10 -rotate-6 items-center justify-center rounded-xl bg-white text-[#b67811] shadow-[0_10px_24px_rgba(31,45,89,0.11)]">
        <Gift className="h-[1.1rem] w-[1.1rem]" />
      </span>
      <span className="absolute bottom-7 right-[13%] flex h-11 w-11 rotate-6 items-center justify-center rounded-xl bg-brand text-white shadow-[0_12px_26px_rgba(36,58,121,0.2)]">
        <PartyPopper className="h-5 w-5" />
      </span>
    </div>
  );
}

export function BirthdayCelebrationModal({
  viewerId,
  role,
  dateKey,
  celebrants
}: {
  viewerId: string;
  role: string;
  dateKey: string;
  celebrants: Celebrant[];
}) {
  const [open, setOpen] = useState(false);
  const celebrantIds = useMemo(() => celebrants.map((person) => person.id).sort().join("-"), [celebrants]);
  const storageKey = `vcglone:birthday:${dateKey}:${celebrantIds}:${viewerId}`;
  const ownBirthday = celebrants.some((person) => person.id === viewerId);
  const chatHref = roleChat(role);

  useEffect(() => {
    if (!celebrants.length) return undefined;
    try {
      if (window.localStorage.getItem(storageKey) === "seen") return undefined;
    } catch {
      // Continue when storage is unavailable.
    }

    let interval: number | undefined;
    const openWhenAvailable = () => {
      if (document.querySelector('[role="dialog"]')) return;
      if (interval) window.clearInterval(interval);
      setOpen(true);
    };
    const timer = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"]')) interval = window.setInterval(openWhenAvailable, 500);
      else setOpen(true);
    }, 1100);

    return () => {
      window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
    };
  }, [celebrants.length, storageKey]);

  function rememberDismissal() {
    try {
      window.localStorage.setItem(storageKey, "seen");
    } catch {
      // The modal still closes when storage is unavailable.
    }
    setOpen(false);
  }

  const title = celebrants.length === 1
    ? `Happy birthday, ${celebrants[0].firstName}!`
    : `Celebrating ${celebrants.length} birthdays today`;
  const description = ownBirthday
    ? "Your vcglOne family is celebrating you today. Wishing you a joyful year ahead."
    : celebrants.length === 1
      ? `Join us in celebrating ${celebrants[0].firstName} and making today memorable.`
      : "Join us in celebrating our colleagues and making their day memorable.";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : rememberDismissal()}>
      <DialogContent
        title={title}
        description={description}
        visuallyHiddenHeader
        className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl overscroll-contain rounded-[1.5rem] p-0 sm:max-h-[92vh] sm:w-[calc(100vw-2rem)] sm:rounded-[1.75rem] sm:p-0"
      >
        <div className="grid lg:min-h-[560px] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="lg:hidden"><MobileBirthdayArtwork /></section>
          <section className="hidden items-center justify-center overflow-hidden bg-[#e7f5ff] p-8 lg:flex"><BirthdayArtwork /></section>

          <section className="flex flex-col p-5 sm:p-9 lg:p-11">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff5d9] px-2.5 py-1 text-[11px] font-semibold text-[#9a650d] sm:px-3 sm:py-1.5 sm:text-xs">
                <PartyPopper className="h-3.5 w-3.5" aria-hidden />
                Today&apos;s celebration
              </span>
              <h2 className="mt-4 pr-8 text-[1.45rem] font-semibold leading-[1.16] tracking-tight text-ink sm:pr-0 sm:text-3xl">{title}</h2>
              <p className="mt-2 text-sm leading-5 text-muted sm:mt-3 sm:text-base sm:leading-6">{description}</p>
            </div>

            <div className="mt-5 space-y-2 sm:mt-7">
              {celebrants.slice(0, 4).map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-2xl bg-[#f6faff] p-3 ring-1 ring-line/70">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white ring-4 ring-brandSoft">{initials(person)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink sm:text-base">{person.firstName} {person.lastName}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted sm:text-sm">{person.department || "VCGL team"}</span>
                  </span>
                  <CakeSlice className="h-5 w-5 shrink-0 text-[#b67811]" aria-hidden />
                </div>
              ))}
              {celebrants.length > 4 ? <p className="px-2 text-xs font-medium text-muted">And {celebrants.length - 4} more celebrating today.</p> : null}
            </div>

            <div className={`mt-auto grid gap-2 pt-5 sm:pt-7 ${ownBirthday ? "" : "sm:grid-cols-2"}`}>
              {ownBirthday ? (
                <Button type="button" onClick={rememberDismissal}>Thank you</Button>
              ) : (
                <Button asChild><Link href={chatHref} onClick={rememberDismissal}><MessageSquare className="h-4 w-4" aria-hidden />Open chat</Link></Button>
              )}
              {!ownBirthday ? <Button type="button" variant="secondary" onClick={rememberDismissal}>Continue</Button> : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
