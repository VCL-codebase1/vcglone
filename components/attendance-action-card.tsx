"use client";

import { Clock, LocateFixed, MapPinOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { submitAttendanceAction } from "@/lib/actions";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTrigger, StatusBadge, Textarea } from "@/components/ui";

type Props = {
  nextAction: "check-in" | "check-out" | "done";
  lastLocation?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  totalMinutes?: number | null;
  status?: string;
  compact?: boolean;
};

async function resolvePlaceName(coords: GeolocationCoordinates) {
  const fallback = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5_000);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(coords.latitude));
    url.searchParams.set("lon", String(coords.longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) return fallback;

    const data = await response.json() as { display_name?: string; name?: string };
    return data.display_name || data.name || fallback;
  } catch {
    return fallback;
  } finally {
    window.clearTimeout(timeout);
  }
}

function getCurrentPosition(options: PositionOptions) {
  return new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      reject,
      options
    );
  });
}

async function captureLocation() {
  try {
    return await getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 });
  } catch (error) {
    if ((error as GeolocationPositionError).code === 1) throw error;
    return getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 });
  }
}

function locationErrorMessage(error: unknown) {
  const code = (error as GeolocationPositionError).code;
  if (code === 1) return "Location permission is blocked. Enable location for this site in your browser settings, then retry, or add a note for review.";
  if (code === 2) return "Your device could not determine its location. Turn on device location or Wi-Fi, then retry, or add a note for review.";
  return "Location took too long to respond. Move near a window or turn on Wi-Fi, then retry, or add a note for review.";
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function dashboardTime(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function WorkingTimeCounter({ checkedInAt, checkedOutAt, totalMinutes, compact = false }: { checkedInAt?: string; checkedOutAt?: string; totalMinutes?: number | null; compact?: boolean }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (checkedOutAt) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [checkedOutAt]);

  if (!checkedInAt) return null;

  const start = new Date(checkedInAt).getTime();
  const end = checkedOutAt ? new Date(checkedOutAt).getTime() : now.getTime();
  const elapsedSeconds = totalMinutes && checkedOutAt ? totalMinutes * 60 : Math.max(0, Math.floor((end - start) / 1000));
  const isComplete = Boolean(checkedOutAt);

  if (compact) {
    return (
      <div>
        <p className="text-xs font-medium text-muted">Duration</p>
        <p className="mt-1 text-base font-semibold text-ink tabular-nums">{formatElapsedTime(elapsedSeconds)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand/10 bg-brandSoft px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">Working time</p>
      <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">{formatElapsedTime(elapsedSeconds)}</p>
      <p className="mt-1 text-sm text-muted">{isComplete ? "Final time recorded at check-out." : "Counting from your check-in time."}</p>
    </div>
  );
}

export function AttendanceActionCard({ nextAction, lastLocation, checkedInAt, checkedOutAt, totalMinutes, status, compact = false }: Props) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [locating, setLocating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function captureAndSubmit(forceLocationRetry = false) {
    setMessage("");
    setWarning("");
    const submit = (coords?: GeolocationCoordinates) => {
      startTransition(async () => {
        const placeName = coords ? await resolvePlaceName(coords) : undefined;
        const result = await submitAttendanceAction({
          action: nextAction,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          accuracy: coords?.accuracy,
          placeName,
          note,
          userAgent: navigator.userAgent
        });
        if (result.ok) {
          setMessage(result.message);
          setNote("");
          setLocationUnavailable(false);
          setDialogOpen(false);
          toast.success(result.message);
        } else {
          setWarning(result.message);
          toast.error(result.message);
        }
      });
    };

    if (locationUnavailable && !forceLocationRetry) {
      if (!note.trim()) {
        setWarning("Add a note so attendance can be submitted for review.");
        return;
      }
      submit();
      return;
    }

    if (!navigator.geolocation) {
      setWarning("Location is unavailable on this device. Add a note to submit for review.");
      setLocationUnavailable(true);
      return;
    }

    if (!window.isSecureContext) {
      setWarning("Location requires a secure HTTPS connection. Add a note to submit for review.");
      setLocationUnavailable(true);
      return;
    }

    setLocating(true);
    try {
      const coords = await captureLocation();
      setLocationUnavailable(false);
      submit(coords);
    } catch (error) {
      const errorMessage = locationErrorMessage(error);
      setWarning(errorMessage);
      toast.warning("Location unavailable", { description: errorMessage });
      setLocationUnavailable(true);
    } finally {
      setLocating(false);
    }
  }

  const disabled = nextAction === "done";

  const actionDialog = (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open && (pending || locating)) return;
      setDialogOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button className={compact ? "w-full shrink-0 sm:w-auto" : "w-full sm:w-auto"} disabled={disabled || pending || locating}>
          {pending ? "Submitting..." : locating ? "Getting location..." : nextAction === "check-in" ? "Check In" : nextAction === "check-out" ? "Check Out" : "Completed"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={nextAction === "check-in" ? "Confirm check in" : "Confirm check out"}
        description="Your browser will ask for location once for this attendance action."
      >
        <div className="space-y-4">
          {locationUnavailable ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-warning">
                <MapPinOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{warning || "Location is unavailable. Add a note to submit for review."}</span>
              </div>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Required note for review because location is unavailable."
                rows={4}
                disabled={disabled || pending}
                required
              />
            </div>
          ) : null}
          <p className="text-sm text-muted">
            vcglOne stores the captured latitude, longitude, GPS accuracy, timestamp, and device information. It does not track your movement continuously.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={pending || locating}>Cancel</Button>
            </DialogClose>
            {locationUnavailable ? (
              <Button type="button" variant="secondary" disabled={pending || locating} onClick={() => captureAndSubmit(true)}>
                {locating ? "Retrying..." : "Retry location"}
              </Button>
            ) : null}
            <Button type="button" disabled={pending || locating} onClick={() => captureAndSubmit()}>
              {pending ? "Submitting..." : locating ? "Getting location..." : locationUnavailable ? "Submit for review" : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (compact) {
    return (
      <Card className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="rounded-xl bg-brandSoft p-2.5 text-brand">
              {disabled ? <Clock className="h-5 w-5" aria-hidden /> : <LocateFixed className="h-5 w-5" aria-hidden />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-ink">
                  {nextAction === "check-in" ? "Start your workday" : nextAction === "check-out" ? "Workday in progress" : "Attendance complete"}
                </h2>
                {status ? <StatusBadge value={status} /> : null}
              </div>
              <p className="mt-1 truncate text-sm text-muted">
                {lastLocation ? `Last location: ${lastLocation}` : "Location is captured only when you submit attendance."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 border-y border-line py-3 xl:min-w-[320px] xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
            <div><p className="text-xs font-medium text-muted">Check in</p><p className="mt-1 text-base font-semibold text-ink">{dashboardTime(checkedInAt)}</p></div>
            <div><p className="text-xs font-medium text-muted">Check out</p><p className="mt-1 text-base font-semibold text-ink">{dashboardTime(checkedOutAt)}</p></div>
            {checkedInAt ? <WorkingTimeCounter compact checkedInAt={checkedInAt} checkedOutAt={checkedOutAt} totalMinutes={totalMinutes} /> : <div><p className="text-xs font-medium text-muted">Duration</p><p className="mt-1 text-base font-semibold text-ink">--</p></div>}
          </div>
          {actionDialog}
        </div>
        {warning ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-warning">
            <MapPinOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{warning}</span>
          </div>
        ) : null}
        {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success">{message}</div> : null}
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-brandSoft p-2 text-brand">
          {disabled ? <Clock className="h-5 w-5" aria-hidden /> : <LocateFixed className="h-5 w-5" aria-hidden />}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {nextAction === "check-in" ? "Check in for today" : nextAction === "check-out" ? "Check out for today" : "Attendance complete"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Your location will only be captured for this attendance action. We do not track your movement continuously.
          </p>
        </div>
      </div>
      {lastLocation ? <p className="rounded-md bg-surface px-3 py-2 text-sm text-muted">Last captured location: {lastLocation}</p> : null}
      {checkedInAt ? <WorkingTimeCounter checkedInAt={checkedInAt} checkedOutAt={checkedOutAt} totalMinutes={totalMinutes} /> : null}
      {warning ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-warning">
          <MapPinOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{warning}</span>
        </div>
      ) : null}
      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success">{message}</div> : null}
      {actionDialog}
    </Card>
  );
}
