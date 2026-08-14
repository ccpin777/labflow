# LabFlow — Windows browser version

This version is designed to run by opening `index.html` directly. It does not need Python, a local server, a terminal window, or an open port.

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
