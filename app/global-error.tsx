"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <section style={{ maxWidth: 480 }}>
            <h1>vcglOne could not recover</h1>
            <p>The issue has been recorded. Refresh the page or try again.</p>
            <button onClick={reset}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
