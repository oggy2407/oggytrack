# oggytrack

**oggytrack** is a fast, local-first academic workspace for students to track courses, build conflict-free class timetables, safeguard subject-wise attendance thresholds, manage assignments and holidays, and view everything on a live unified calendar.

---

## Table of Contents

1. [Key Features](#key-features)
2. [How It Works](#how-it-works)
   - [System Architecture](#system-architecture)
   - [Data Storage & Multi-User Isolation](#data-storage--multi-user-isolation)
   - [Live Time, Holidays & Calendar Sync](#live-time-holidays--calendar-sync)
3. [Project Structure](#project-structure)
## Key Features

- **Attendance Safeguard & Recovery Engine**: Tracks `present`, `late`, `absent`, and `cancelled` sessions per subject, calculates exact safe-to-miss ("safe bunk") buffers, computes consecutive classes needed to recover below-target subjects, and includes an interactive **What-If Simulator**.
- **Conflict-Free Timetable & Importer**: Weekly and daily timetable views with automatic room/time overlap detection, plus bulk schedule import from CSV or JSON.
- **Assignments & Priority Board**: Manage coursework deadlines, priorities (`low`, `medium`, `high`), statuses (`pending`, `in-progress`, `completed`), and course filters.
- **Academic Holidays Manager**: Log single-day or multi-day breaks (`public`, `exam-break`, `semester-break`, `personal`, `custom`) with an optional **Suspend Classes** toggle that automatically pauses scheduled classes on those dates.
- **Live Unified Calendar & `.ics` Export**: Real-time month grid and agenda combining recurring classes, assignment due dates, and holidays—exportable to external calendar apps via standard `.ics` files.
- **Dynamic Semester Analytics**: Real-time metrics bound to your configured semester, target attendance threshold, and course health distribution.
- **Responsive Sidebar Navigation**: Persistent left sidebar on desktop and a smooth slide-out left drawer on mobile viewports, paired with portal-rendered modals (`ModalShell`) for zero clipping on small screens.
- **Portable JSON Backup & Restore**: One-click full workspace export and import in Settings to move data across browsers or devices.

---

## How It Works

### System Architecture

oggytrack runs entirely in the browser as a single-page application (SPA) built with:

- **UI & State**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: `lucide-react`
- **Testing**: Node's built-in test runner (`node:test` + `node:assert/strict`) executed via `tsx`

There is no external database server required. Authentication, academic records, and workspace preferences run client-side with instant zero-latency reads and writes.

### Data Storage & Multi-User Isolation

Persistence is managed by `src/utils/storage.ts` using browser `localStorage` scoped per Origin (`protocol + domain + port`):

| Key Pattern | Scope | Purpose |
| :--- | :--- | :--- |
| `oggytrack_accounts` | Global (device) | Registered local user profiles & credentials |
| `oggytrack_auth` / `oggytrack_current_user` | Global (device) | Active authenticated session state |
| `oggytrack_settings` | Global (device) | Workspace preferences & default attendance target |
| `oggytrack_subjects_<userId>` | Per User | Course catalog & per-subject target thresholds |
| `oggytrack_timetable_<userId>` | Per User | Weekly recurring class sessions |
| `oggytrack_attendance_<userId>` | Per User | Dated session attendance logs |
| `oggytrack_assignments_<userId>` | Per User | Coursework tasks, deadlines & priorities |
| `oggytrack_holidays_<userId>` | Per User | Academic holidays & class-suspension rules |
| `oggytrack_notifications_<userId>` | Per User | In-app reminders & alerts |

> **How storage behaves when deployed online**: Because `localStorage` lives inside each visitor's own browser, deploying the app to a public URL gives every visitor their own private, isolated workspace on their device—visitors never see each other's data. To transfer a workspace to another laptop or phone, use **Settings -> Export Backup (`.json`)** and **Import Backup**.

### Live Time, Holidays & Calendar Sync

`src/utils/dateUtils.ts` formats all dates in the device's **local timezone** (`YYYY-MM-DD`) rather than UTC slices, preventing off-by-one date shifts near midnight. A shared `useLiveClock()` hook keeps dashboard greetings, active day highlights, and calendar "Today" markers continuously synchronized.

---

## Project Structure

```text
.
├── .github/workflows/ci.yml        # GitHub Actions pipeline (typecheck, unit tests, build)
├── index.html                      # App HTML entry point
├── package.json                    # Scripts and dependencies
├── vite.config.ts                  # Vite + React + Tailwind v4 configuration
└── src/
    ├── App.tsx                     # Root session controller, layout & active view router
    ├── index.css                   # Tailwind CSS v4 import & base theme rules
    ├── types/oggytrack.ts          # Domain TypeScript interfaces
    ├── utils/
    │   ├── academicCalculations.ts # Pure attendance & forecasting formulas
    │   ├── academicCalculations.test.ts
    │   ├── dateUtils.ts            # Local date helpers, live clock hook & .ics generator
    │   ├── dateUtils.test.ts
    │   └── storage.ts              # Multi-user localStorage CRUD & JSON backup/restore
    └── components/
        ├── auth/                   # Sign-in & account creation (e.g. username: oggy)
        ├── common/ModalShell.tsx   # Portal-rendered accessible dialog container
        ├── layout/                 # Responsive Sidebar (desktop + mobile drawer) & Navbar
        ├── dashboard/              # Overview cards, today's classes & attendance alerts
        ├── subjects/               # Subject CRUD & target percentage settings
        ├── timetable/              # Weekly/daily schedule & CSV/JSON timetable importer
        ├── attendance/             # Daily attendance logger & what-if calculator
        ├── assignments/            # Deadlines & priority task manager
        ├── holidays/               # Holiday manager with class-suspension support
        ├── calendar/               # Live monthly calendar & .ics export
        ├── analytics/              # Dynamic semester analytics & course breakdown
        └── settings/               # Profile, semester config, JSON export/import & reset
```

---

## Local Setup & Development

### Prerequisites

- **Node.js** `20.x` or `22.x` (LTS recommended)
- **npm** `10+`

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser. Create a local account (for example, username `oggy`) to launch your workspace.

### 3. Run Unit Tests & Typecheck

```bash
# Run pure-logic unit tests (attendance math & calendar date utilities)
npm test

# Run TypeScript compiler check
npm run lint

# Build production static bundle into dist/
npm run build






