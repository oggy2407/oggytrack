# oggytrack

**oggytrack** is a fast, local-first academic workspace for students to track courses, build conflict-free class timetables, safeguard subject-wise attendance thresholds, manage assignments and holidays, and view everything on a live unified calendar.

---

## Table of Contents

1. [Key Features](#key-features)
2. [How It Works](#how-it-works)
   - [System Architecture](#system-architecture)
   - [Attendance & Forecasting Math](#attendance--forecasting-math)
   - [Data Storage & Multi-User Isolation](#data-storage--multi-user-isolation)
   - [Live Time, Holidays & Calendar Sync](#live-time-holidays--calendar-sync)
3. [Project Structure](#project-structure)
4. [Local Setup & Development](#local-setup--development)
5. [GitHub Setup & Deployment](#github-setup--deployment)
   - [1. Push Project to GitHub](#1-push-project-to-github)
   - [2. Automated CI with GitHub Actions](#2-automated-ci-with-github-actions)
   - [3. Deploy Online (Vercel / Netlify / GitHub Pages)](#3-deploy-online-vercel--netlify--github-pages)
6. [Claude Setup (Claude Code & Claude Projects)](#claude-setup-claude-code--claude-projects)
   - [Option A: Claude Code CLI & IDE Integration](#option-a-claude-code-cli--ide-integration)
   - [Option B: Claude Web / Desktop Projects (via GitHub)](#option-b-claude-web--desktop-projects-via-github)

---

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

### Attendance & Forecasting Math

All academic calculations live in pure, unit-tested functions in `src/utils/academicCalculations.ts`:

1. **Conducted vs. Attended Sessions**:
   - `Present` and `Late` count as **attended** (`A`) and **conducted** (`C`).
   - `Absent` counts as **conducted** (`C`), not attended.
   - `Cancelled` classes are excluded from `C` so cancelled lectures never penalize your percentage.
   - When `C = 0` (no classes conducted yet), attendance displays **`0%` (`No Classes Yet`)** rather than a misleading `100%`.

2. **Safe-to-Miss Buffer** (when current attendance $\ge$ target ratio $T$):
   $$\text{Safe Misses} = \left\lfloor \frac{A - T \cdot C}{T} \right\rfloor$$

3. **Recovery Streak** (when current attendance $<$ target ratio $T$):
   $$\text{Classes Needed} = \left\lceil \frac{T \cdot C - A}{1 - T} \right\rceil$$

4. **What-If Projection**:
   Simulates attending the next $X$ classes and missing $Y$ classes:
   $$\text{Projected \%} = \frac{A + X}{C + X + Y} \times 100$$

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
├── CLAUDE.md                       # Context & instructions automatically read by Claude Code
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
```

---

## GitHub Setup & Deployment

### 1. Push Project to GitHub

From the project root directory, initialize Git and push to a new GitHub repository:

```bash
# Initialize repository (if not already initialized)
git init
git branch -M main

# Stage and commit all project files
git add .
git commit -m "Initial commit: oggytrack academic workspace"
```

Create a new empty repository on GitHub:

- **Via GitHub CLI (`gh`)** *(fastest)*:
  ```bash
  gh repo create oggytrack --public --source=. --remote=origin --push
  ```
- **Or manually via GitHub Web UI**:
  1. Go to [https://github.com/new](https://github.com/new) and create a repository named `oggytrack` (leave *"Initialize with README"* unchecked).
  2. Link the remote and push:
     ```bash
     git remote add origin https://github.com/<your-username>/oggytrack.git
     git push -u origin main
     ```

### 2. Automated CI with GitHub Actions

This repository includes `.github/workflows/ci.yml` out of the box. Every `git push` or Pull Request to `main` automatically runs:

1. `npm ci`
2. `npm run lint` (`tsc --noEmit`)
3. `npm test` (unit test suite)
4. `npm run build` (production Vite bundle check)

### 3. Deploy Online (Vercel / Netlify / GitHub Pages)

Because oggytrack compiles to static assets in `dist/`, you can host it for free on any static host:

- **Vercel**: Import your GitHub repo -> Framework Preset: **Vite** -> Build Command: `npm run build` -> Output Directory: `dist`.
- **Netlify**: Import from GitHub -> Build Command: `npm run build` -> Publish Directory: `dist`.
- **Cloudflare Pages**: Connect GitHub -> Build Command: `npm run build` -> Build Output Directory: `dist`.

---

## Claude Setup (Claude Code & Claude Projects)

This repository includes a pre-configured **`CLAUDE.md`** file in the root directory. `CLAUDE.md` gives Claude instant awareness of all build/test commands, folder structure, `localStorage` user-scoping rules, attendance math edge cases, and UI conventions without needing to re-explain the codebase in every prompt.

### Option A: Claude Code CLI & IDE Integration

[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) runs directly in your terminal (or VS Code / Cursor terminal) and automatically loads `/CLAUDE.md` on startup.

#### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

#### 2. Launch Claude in the Repository

```bash
cd oggytrack
claude
```

On first launch, follow the interactive login prompt to authenticate with your Anthropic / Claude account.

#### 3. Connect Claude Code with GitHub (Recommended)

Install and authenticate the GitHub CLI (`gh`) so Claude Code can inspect issues, create branches, commit changes, and open Pull Requests directly for you:

```bash
gh auth login
```

Inside a `claude` session, you can also install the official Claude GitHub App for automated PR reviews:

```text
/install-github-app
```

#### 4. Useful Claude Code Commands & Example Prompts

- `/memory` — Inspect or edit `CLAUDE.md` memory rules loaded in the session.
- `/compact` — Summarize long sessions while keeping `CLAUDE.md` invariants intact.
- Example prompts you can run immediately:
  - *"Add a GPA / grade-point estimator tab scoped per user in `storage.ts`, write unit tests in `src/utils/`, and run `npm run lint && npm test`."*
  - *"Create a new branch, add CSV export for attendance logs, verify all tests pass, and open a GitHub PR."*

---

### Option B: Claude Web / Desktop Projects (via GitHub)

If you use **Claude.ai** on the web or the **Claude Desktop** app instead of the CLI:

1. Push this codebase to GitHub using the steps in [GitHub Setup](#1-push-project-to-github).
2. Open Claude -> **Projects** -> **Create Project** (e.g., `oggytrack`).
3. Under **Project Knowledge**, click **Add Content -> Connect GitHub** and select your `oggytrack` repository (`main` branch).
4. Copy the contents of `CLAUDE.md` into **Project Instructions** (or tell Claude to always follow `CLAUDE.md` in Project Knowledge).
5. Whenever you push new commits to GitHub, click **Sync** in your Claude Project so Claude always works against your latest files.
