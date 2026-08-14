# LabFlow — Windows browser version

The cloud version is designed to run from GitHub Pages or another HTTP/HTTPS host. For local testing, use `Run.command` or a local HTTP server; opening `index.html` directly is only suitable for viewing the static layout.

## Start

Double-click:

```text
index.html
```

LabFlow opens in your default browser. The app includes its fallback/demo data in `app.js`. After that, all experiment, procedure, calendar, and measurement changes are saved in that browser on that Windows computer.

## Data behavior

- Demo/fallback data is embedded in `app.js`; no separate data folder is required at runtime.
- Live data is stored in the browser using `localStorage`.
- The data belongs to that browser profile and computer.
- Clearing browser site data can remove it.
- Copying the folder later does not copy the browser data.
- Use the same browser profile for future sessions.

For a portable copy with data that travels with the folder, use the normal server version instead.

## Fonts

The selected display fonts are included locally under `fonts/`, so the interface does not need Google Fonts or an internet connection.

## Procedure privacy

The deployed version contains no built-in experiment procedures. Procedures are stored in the browser and can be moved to another browser through the ZIP backup in Settings.

## Security checklist

- Keep Row Level Security enabled on `public.labflow_data`.
- Keep policies restricted to `auth.uid() = user_id`.
- Never put a Supabase `service_role` or `secret` key in this repository.
- In Supabase Auth, keep email confirmation enabled and set a strong password policy.
- Consider enabling leaked-password protection and MFA for a production deployment.
- The public `anon`/publishable key is expected in the browser; RLS is what protects the data.
