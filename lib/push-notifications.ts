import webpush, { type PushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";

export type PushPayload = {
  id?: string;
  title: string;
  message: string;
  href?: string | null;
};

function vapidDetails() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function getPushConfiguration() {
  const details = vapidDetails();
  return {
    configured: Boolean(details),
    publicKey: details?.publicKey || null
  };
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const details = vapidDetails();
  if (!details) return { sent: 0, removed: 0 };

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true }
  });
  let sent = 0;
  let removed = 0;

  await Promise.all(subscriptions.map(async (subscription) => {
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth }
    };
    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
        TTL: 60 * 60,
        urgency: "normal",
        topic: payload.id?.slice(0, 32),
        vapidDetails: details
      });
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.webPushSubscription.deleteMany({ where: { id: subscription.id } });
        removed += 1;
      }
    }
  }));

  return { sent, removed };
}
