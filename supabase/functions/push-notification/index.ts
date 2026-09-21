// supabase/functions/push-notification/index.ts
//
// Runs once a day (set up on a schedule — see the README below).
// Finds every reservation checking in tomorrow, and sends one push
// notification per subscribed device summarizing them.
//
// Auth: this function has Supabase's built-in JWT check turned OFF
// (see README — "Turn off JWT verification"), and instead checks its
// own CRON_SECRET below. That avoids the newer API key formats
// clashing with Supabase's JWT gateway, and is simpler to call from
// a cron job or the Dashboard's manual test button.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

webpush.setVapidDetails("mailto:office@vilasilvia.ro", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// Records that this scheduled run happened, so the admin panel's System
// tab can show "last run" without needing a separate scheduler service —
// it just reads the same app_errors table the error log already uses.
async function logRun(supabase: ReturnType<typeof createClient>, code: string | null, message: string) {
  // supabase.rpc() returns a minimal thenable in this Deno runtime, not a
  // real Promise — it has no .catch(), so a try/await is needed instead.
  try {
    await supabase.rpc("log_error", { p_source: "push-notification", p_code: code, p_message: message });
  } catch {
    // best-effort — a logging failure should never break the actual run
  }
}

Deno.serve(async (req) => {
  // Our own auth check — pass ?secret=... in the URL, or an
  // x-cron-secret header, either works (URL param is easiest to test
  // from a browser address bar or the Dashboard's Invoke panel).
  const url = new URL(req.url);
  const providedSecret = url.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (providedSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const tomorrow = tomorrowDateString();

  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("guest, room, room_number")
    .eq("checkin", tomorrow)
    .neq("status", "cancelled");

  if (resError) {
    await logRun(supabase, "FAIL", resError.message);
    return new Response(JSON.stringify({ error: resError.message }), { status: 500 });
  }

  if (!reservations || reservations.length === 0) {
    await logRun(supabase, null, "Ran — no check-ins tomorrow.");
    return new Response(JSON.stringify({ sent: 0, reason: "No check-ins tomorrow." }));
  }

  const { data: subs, error: subError } = await supabase.from("push_subscriptions").select("*");
  if (subError) {
    await logRun(supabase, "FAIL", subError.message);
    return new Response(JSON.stringify({ error: subError.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    await logRun(supabase, null, "Ran — no subscribed devices.");
    return new Response(JSON.stringify({ sent: 0, reason: "No subscribed devices." }));
  }

  const list = reservations.map((r) => `${r.guest} (${r.room} Nr. ${r.room_number})`).join(", ");
  const title = reservations.length === 1 ? "Sosire mâine" : `${reservations.length} sosiri mâine`;
  const payload = JSON.stringify({
    title,
    body: list,
    url: "./admin.html#reservations"
  });

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err) {
      // 404/410 means the browser unsubscribed or the subscription expired — clean it up.
      if (err.statusCode === 404 || err.statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      } else {
        console.error("Push failed for", sub.endpoint, err);
      }
    }
  }

  if (staleEndpoints.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  await logRun(supabase, null, `Ran — sent ${sent} notification(s), removed ${staleEndpoints.length} stale subscription(s).`);
  return new Response(JSON.stringify({ sent, staleRemoved: staleEndpoints.length }));
});
