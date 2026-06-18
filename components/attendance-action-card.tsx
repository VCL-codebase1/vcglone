"use client";

import { Clock, LocateFixed, MapPinOff } from "lucide-react";
import { useState, useTransition } from "react";
import { submitAttendanceAction } from "@/lib/actions";
import { Button, Card, Textarea } from "@/components/ui";

type Props = {
  nextAction: "check-in" | "check-out" | "done";
  lastCoordinates?: string;
};

export function AttendanceActionCard({ nextAction, lastCoordinates }: Props) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
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
        } else {
          setWarning(result.message);
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
        submit();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  const disabled = nextAction === "done";

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-blue-50 p-2 text-brand">
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
      <Button className="w-full sm:w-auto" disabled={disabled || pending} onClick={captureAndSubmit}>
        {pending ? "Submitting..." : nextAction === "check-in" ? "Check In" : nextAction === "check-out" ? "Check Out" : "Done"}
      </Button>
    </Card>
  );
}
