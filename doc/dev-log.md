# LabFlow development log

This document records the major product and implementation decisions made during the prototype phase.

## 2026-08-13

### Persistence and local server

- Moved application data into project-local JSON files under `data/`.
- Kept experiments, Experimental Procedures, and Measurements in separate files.
- Added a small Python server so the browser can read and write those files.
- Added a macOS `Run.command` launcher.
- Added a local heartbeat so the server can stop after the browser is closed.
- Added a fallback from port 8000 to port 8001 when 8000 is already occupied.

### Experimental Procedures

- Separated reusable procedures from experiment instances.
- Added IEC-CEM, Fenton, and Conductivity procedures.
- IEC-CEM currently uses `Dry`, `1N H2SO4 solution`, `NaNO3 soak`, and `Measurement` stages.
- Procedure stages use flexible numeric durations with `h` or `min` display/input support.
- Removed Active/Passive as a user-facing distinction after deciding that the physical work around a passive period still matters to the researcher.
- Added New Procedure with automatically numbered stages.

### Experiments and timing

- Changed batch-oriented naming to sample-oriented naming.
- New Experiment creates one input for each sample.
- A calculated ready time does not automatically start the next stage.
- Completing a current step lets the user start the next step now or choose the actual transition time.
- Added editing of actual start time and delay shortcuts.
- Future-start experiments are represented as upcoming rather than waiting.
- Calendar projects later transition markers into the appropriate week.

### Calendar

- Added a week view with a shared vertical time axis.
- Passive workflow transitions appear as lightweight markers.
- Measurement and other occupied work appears as time blocks.
- Calendar events have stable, restrained per-experiment colors.
- The current day highlights only its date header, not the entire day column.
- Added calendar double-click details and right-click New Experiment on an empty day.
- Added independent horizontal/vertical scrolling inside the calendar frame.

### Measurements

- Added an independent sample × measurement table.
- The table does not depend on experiment data or calendar data.
- Default measurement columns include Conductivity, IEC, Fenton, and TGA.
- Added `+ Sample` and `+ Measurement` buttons.
- Added status cycling: empty → Planned (`○`) → Done (`✓`) → empty.
- Added a Planned/Done legend.
- Moved Edit to the right of the add buttons.
- Sample and measurement names can be renamed only in Edit mode.
- Edit mode shows three-line drag handles and supports row/column reordering.

### Interface

- Kept the main navigation intentionally small: Today, Experiments, Calendar, Measurements, and Experimental Procedure.
- Added interface text-size choices: Standard, Large, and Extra large.
- Added optional title/display fonts: System, Gochi Hand, Permanent Marker, and Damion.
- Display-font preferences affect selected headings and the LabFlow wordmark, not the whole application body.
- Kept the visual language calm, spacious, and lightweight.

## Product decisions

### Ready is not automatically overdue

The normal progression is:

```text
Waiting → Ready → user confirms the physical action → next stage starts
```

This avoids turning ordinary laboratory delays into unnecessary alarms.

### Passive time versus occupied time

Long waiting periods are represented internally by transition markers. Only work that actually occupies the researcher should become a calendar block.

### Measurements remain independent

The Measurements table is a planning/checklist surface for arbitrary samples and measurement types. It is intentionally not linked to experiment sample names, procedures, or calendar blocks.

## Known follow-up work

- Split the large `app.js` and layered `styles.css` into clearer modules/sections when the prototype stabilizes.
- Remove remaining unused constants and helper functions from earlier storage implementations.
- Improve error feedback when a JSON file cannot be read or written.
- Add focused tests for date parsing, future starts, stage transitions, and calendar week projection.
- Consider a safer launcher diagnostic that prints the process owning port 8000 before falling back.
- Add export/import or backup helpers before introducing cloud sync.


## 2026-08-14

### Supabase cloud planning

- Connected LabFlow authentication to Supabase Email/Password Auth.
- Added cloud persistence for schedules, Procedures, and Sample Measurements in `labflow_data`.
- Added RLS policies so each account can access only its own row.
- Kept the public anon key in the frontend; no service-role or secret key is used.
- Added cloud status feedback for loading, saving, saved, and unavailable states.
- Added protection against carrying one account's local data into another account.
- Added Forgot password and password recovery screens.
- Added an empty-Procedure guard before starting a new experiment.

### Security and reliability

- Escaped user-provided names, locations, notes, and calendar detail output.
- Pinned the Supabase browser SDK version.
- Disabled the old cache-first Service Worker to prevent stale deployments.
- Added `Run.command` for local HTTP testing; direct `index.html` opening is now only for static layout checks.
- Added a visible LabFlow favicon and matching PWA icon.
- Added ZIP backup support for schedules, Procedures, and Sample Measurements.

### Product direction

- Flexible work is now added with `+ Lab block` beside `+ New experiment`.
- Started considering Sample Measurement Groups for growing sample lists.
- Stock Solution Calculation remains a separate offline-capable tool and may later be linked from the public login screen.
