"use client";

import { Clock, LocateFixed, MapPinOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { submitAttendanceAction } from "@/lib/actions";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTrigger, Textarea } from "@/components/ui";

type Props = {
  nextAction: "check-in" | "check-out" | "done";
  lastLocation?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  totalMinutes?: number | null;
};

async function resolvePlaceName(coords: GeolocationCoordinates) {
  const fallback = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(coords.latitude));
    url.searchParams.set("lon", String(coords.longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return fallback;

    const data = await response.json() as { display_name?: string; name?: string };
    return data.display_name || data.name || fallback;
  } catch {
    return fallback;
  }
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function WorkingTimeCounter({ checkedInAt, checkedOutAt, totalMinutes }: { checkedInAt?: string; checkedOutAt?: string; totalMinutes?: number | null }) {
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

  return (
    <div className="rounded-lg border border-brand/10 bg-brandSoft px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">Working time</p>
      <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">{formatElapsedTime(elapsedSeconds)}</p>
      <p className="mt-1 text-sm text-muted">{isComplete ? "Final time recorded at check-out." : "Counting from your check-in time."}</p>
    </div>
  );
}

export function AttendanceActionCard({ nextAction, lastLocation, checkedInAt, checkedOutAt, totalMinutes }: Props) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function captureAndSubmit() {
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

    if (locationUnavailable) {
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

    navigator.geolocation.getCurrentPosition(
      (position) => submit(position.coords),
      () => {
        setWarning("Location permission was denied or unavailable. Add a note to submit for review.");
        toast.warning("Location unavailable", { description: "Add a note so attendance can be submitted for review." });
        setLocationUnavailable(true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  const disabled = nextAction === "done";

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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto" disabled={disabled || pending}>
            {pending ? "Submitting..." : nextAction === "check-in" ? "Check In" : nextAction === "check-out" ? "Check Out" : "Done"}
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
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="button" disabled={pending} onClick={captureAndSubmit}>
                {pending ? "Submitting..." : locationUnavailable ? "Submit for review" : "Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
