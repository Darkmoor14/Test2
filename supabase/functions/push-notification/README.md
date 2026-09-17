# Deploying push-notification to the self-hosted instance

This function has no Management API on self-hosted Supabase, so it's deployed
by dropping the file into the `functions` container's mounted volume and
restarting that one container. Run all of this over SSH on the VPS
(`ssh tagstop@5.189.176.34`), from inside your Supabase stack directory
(the one containing `docker-compose.yml`, e.g. `~/supabase-project/docker`).

## 1. Pull the function code onto the server

```bash
mkdir -p volumes/functions/push-notification
curl -sL https://raw.githubusercontent.com/Darkmoor14/test2/main/supabase/functions/push-notification/index.ts \
  -o volumes/functions/push-notification/index.ts
```

## 2. Add the function's secrets to `.env`

Open `.env` (same directory as `docker-compose.yml`) and add three lines —
use the actual values you were given out-of-band, not placeholders:

```bash
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
CRON_SECRET=...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` don't need adding — the
self-hosted `functions` service already forwards those to every function.

## 3. Wire the new env vars into the `functions` service

Edit `docker-compose.yml`, find the `functions:` service, and add these
three lines under its existing `environment:` block (next to
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.):

```yaml
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      CRON_SECRET: ${CRON_SECRET}
```

## 4. Turn off JWT verification for this one function

Self-hosted's function router (`volumes/functions/main/index.ts`) verifies
JWTs by default. This function does its own `CRON_SECRET` check instead, so
add its slug to that router's no-verify list — open
`volumes/functions/main/index.ts` and look for the `verifyJWT` /
`NO_VERIFY_JWT` handling near the top; add `push-notification` to it. (Exact
variable name can differ slightly by Supabase version — search the file for
`verifyJWT` if it's not obvious.)

## 5. Recreate the functions container

```bash
docker compose up -d functions
docker compose logs -f functions   # watch for startup errors, then Ctrl+C
```

## 6. Test it

```bash
curl "https://supabase.tag-stop.de/functions/v1/push-notification?secret=YOUR_CRON_SECRET" \
  -H "apikey: sb_publishable_0BR0U569JJ_NIYrxX5YXrI_6yxEk_bt"
```

Expect `{"sent":0,"reason":"No check-ins tomorrow."}` (or a real send count if
someone checks in tomorrow) — not a 401. A 401 with `"Unauthorized"` in the
body means the CRON_SECRET didn't match; a 401 *without* that body is Kong or
the JWT router blocking the request before it reaches the function (revisit
step 4, or check Kong's `apikey` requirement on the `/functions/v1` route).

## 7. Schedule it daily

Plain system cron on the VPS, once a day (e.g. 18:00 server time, so it
lands before evening check-ins are usually finalized):

```bash
crontab -e
# add:
0 18 * * * curl -s "https://supabase.tag-stop.de/functions/v1/push-notification?secret=YOUR_CRON_SECRET" -H "apikey: sb_publishable_0BR0U569JJ_NIYrxX5YXrI_6yxEk_bt" >> /var/log/push-notification.log 2>&1
```

(pg_cron inside Postgres is the other option, but plain cron is simpler to
read and debug on a single-server setup like this one.)

## 8. Re-subscribe devices

The old cloud project's one `push_subscriptions` row wasn't migrated (its
keys were tied to the old, now-orphaned VAPID public key). Once `admin.html`
is deployed with the new `VAPID_PUBLIC_KEY` (see the commit that touches
this README), open the dashboard on each phone/device that wants
notifications and hit "Activează notificările" again.
