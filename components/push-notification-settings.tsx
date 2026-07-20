"use client";

import { AlertTriangle, BellRing, CheckCircle2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui";

type PushConfiguration = { configured: boolean; publicKey: string | null };
type BusyAction = "enable" | "disable" | "test" | null;

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = window.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

async function responseMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return payload?.message || fallback;
}

export function PushNotificationSettings() {
  const [configuration, setConfiguration] = useState<PushConfiguration>({ configured: false, publicKey: null });
  const [loaded, setLoaded] = useState(false);
  const [supported, setSupported] = useState(true);
  const [installRequired, setInstallRequired] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState<BusyAction>(null);

  useEffect(() => {
    async function load() {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || standaloneNavigator.standalone === true;
      setInstallRequired(isIos && !isStandalone);

      const supportsPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setSupported(supportsPush || (isIos && !isStandalone));
      if ("Notification" in window) setPermission(Notification.permission);

      try {
        const response = await fetch("/api/notifications/push", { cache: "no-store" });
        if (!response.ok) throw new Error(await responseMessage(response, "Unable to load phone notification settings."));
        setConfiguration(await response.json() as PushConfiguration);
        if (supportsPush) {
          const registration = await navigator.serviceWorker.ready;
          setEnabled(Boolean(await registration.pushManager.getSubscription()));
        }
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, []);

  async function enableNotifications() {
    if (installRequired) {
      toast.warning("Install vcglOne first", { description: "On iPhone, use Share → Add to Home Screen, then open the installed app and enable notifications." });
      return;
    }
    if (!supported || !configuration.configured || !configuration.publicKey) return;

    setBusy("enable");
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") throw new Error("Notification permission was not granted. Enable it in your browser or phone settings and try again.");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(configuration.publicKey)
      });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) throw new Error("The device returned an incomplete push subscription.");

      const response = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: serialized.endpoint, keys: serialized.keys })
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Unable to save this device."));
      setEnabled(true);
      toast.success("Phone notifications enabled");

      const testResponse = await fetch("/api/notifications/push/test", { method: "POST" });
      if (!testResponse.ok) toast.warning("Enabled, but the test notification could not be sent.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function disableNotifications() {
    setBusy("disable");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/notifications/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        if (!response.ok) throw new Error(await responseMessage(response, "Unable to remove this device."));
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success("Phone notifications disabled on this device");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy("test");
    try {
      const response = await fetch("/api/notifications/push/test", { method: "POST" });
      if (!response.ok) throw new Error(await responseMessage(response, "Unable to send a test notification."));
      toast.success("Test notification sent");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_12px_32px_rgba(23,32,51,0.06)] ring-1 ring-line/70 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brandSoft text-brand">
          <Smartphone className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-ink">Phone notifications</h2>
            {enabled ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Enabled</span> : null}
          </div>
          <p className="mt-1 text-sm text-muted">Receive attendance, leave, account, and chat alerts on this device even when vcglOne is closed.</p>
        </div>
      </div>

      {installRequired ? <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><p>On iPhone, open the Share menu, choose <strong>Add to Home Screen</strong>, then open vcglOne from its Home Screen icon to enable notifications.</p></div> : null}
      {!supported && !installRequired ? <div className="mt-4 rounded-xl border border-line bg-surface p-3 text-sm text-muted">This browser does not support phone notifications. Try the installed app, Chrome, Edge, Firefox, or Safari on a supported device.</div> : null}
      {loaded && !configuration.configured ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Phone notifications are temporarily unavailable. Please contact your administrator.</div> : null}
      {permission === "denied" ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Notifications are blocked for vcglOne. Allow them in the browser or phone notification settings, then return here.</div> : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {enabled ? <>
          <Button type="button" onClick={sendTest} disabled={busy !== null}><BellRing className="h-4 w-4" aria-hidden />{busy === "test" ? "Sending..." : "Send test"}</Button>
          <Button type="button" variant="secondary" onClick={disableNotifications} disabled={busy !== null}>{busy === "disable" ? "Disabling..." : "Disable on this device"}</Button>
        </> : <Button type="button" onClick={enableNotifications} disabled={!loaded || busy !== null || !supported || !configuration.configured}><BellRing className="h-4 w-4" aria-hidden />{busy === "enable" ? "Enabling..." : "Enable on this device"}</Button>}
      </div>
    </section>
  );
}
