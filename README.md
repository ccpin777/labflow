# LabFlow — browser and macOS desktop app

The cloud version is designed to run from GitHub Pages or another HTTP/HTTPS host. For local testing, use `Run.command` or a local HTTP server; opening `index.html` directly is only suitable for viewing the static layout.

## Start

For the cloud version, open the GitHub Pages URL. For local testing on macOS, run `bash ./Run.command` and choose `1` for Browser or `2` for the PyWebView desktop app. Directly opening `index.html` is only suitable for checking the static layout.

To build the macOS desktop app, run `zsh ./command/build.command`; the completed app is written to `dist/`, and temporary `build/` files are removed after a successful build. For desktop menu diagnostics, use `LABFLOW_DEBUG=1 bash ./Run.command`.

After signing in, experiments, Procedures, calendar planning, and Sample Measurements are stored in Supabase. If Supabase is unavailable, the app reports the cloud connection problem instead of silently pretending that data was synced.

## Data behavior

- Demo/fallback data is embedded in `app.js`; no separate data folder is required at runtime.
- Live data is stored in the browser using `localStorage`.
- The data belongs to that browser profile and computer.
- Clearing browser site data can remove it.
- Copying the folder later does not copy the browser data.
- Use the same browser profile for future sessions.

Use Settings → Export for a portable ZIP backup containing schedules, Procedures, and Sample Measurements.

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

## Assets

- Web-facing generated images live under `assets/branding/`.
- PWA icons live under `assets/icons/` for the web app.
- Desktop/source copies of the images and icons live directly under `resources/`.
