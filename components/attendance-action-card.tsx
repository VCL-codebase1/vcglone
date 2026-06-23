"use client";

import { Clock, LocateFixed, MapPinOff } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { submitAttendanceAction } from "@/lib/actions";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTrigger, Textarea } from "@/components/ui";

type Props = {
  nextAction: "check-in" | "check-out" | "done";
  lastCoordinates?: string;
};

export function AttendanceActionCard({ nextAction, lastCoordinates }: Props) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function captureAndSubmit() {
    setMessage("");
    setWarning("");
    const submit = (coords?: GeolocationCoordinates) => {
      startTransition(async () => {
        const result = await submitAttendanceAction({
          action: nextAction,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          accuracy: coords?.accuracy,
          note,
          userAgent: navigator.userAgent
        });
        if (result.ok) {
          setMessage(result.message);
          setNote("");
          setDialogOpen(false);
          toast.success(result.message);
        } else {
          setWarning(result.message);
          toast.error(result.message);
        }
      });
    };

    if (!navigator.geolocation) {
      setWarning("Location is unavailable on this device. Add a note and submit again.");
      submit();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => submit(position.coords),
      () => {
        setWarning("Location permission was denied or unavailable. Add a note to submit for review.");
        toast.warning("Location unavailable", { description: "Add a note so attendance can be submitted for review." });
        submit();
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
      {lastCoordinates ? <p className="rounded-md bg-surface px-3 py-2 text-sm text-muted">Last captured coordinates: {lastCoordinates}</p> : null}
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note. Required if location is unavailable."
        rows={4}
        disabled={disabled || pending}
      />
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
            <p className="text-sm text-muted">
              vcglOne stores the captured latitude, longitude, GPS accuracy, timestamp, device information, and your optional note. It does not track your movement continuously.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="button" disabled={pending} onClick={captureAndSubmit}>
                {pending ? "Submitting..." : "Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
