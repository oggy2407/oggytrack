import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { AppSettings, UserProfile } from '../../types/oggytrack';
import { applyWorkspaceAccentToRoot } from '../../utils/colorPalette';
import { applyGlassAppearanceToRoot } from '../../utils/wallpaperGlass';
import { db } from '../../utils/storage';
import { BrandLogo } from '../common/BrandLogo';
import { CustomPhotoBackground } from '../common/CustomPhotoBackground';
import { MarsPlanetCanvas } from '../mars/MarsPlanetCanvas';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  User,
  Users,
} from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (user: UserProfile, isNewUser: boolean) => void;
  onLaunchDemo?: () => void;
  settings?: AppSettings;
  customWallpaper?: string | null;
}

type FeatureIconId = 'workflow' | 'analytics' | 'leads' | 'bolt' | 'shield' | 'globe';

const FeatureSvgIcon: React.FC<{ id: FeatureIconId }> = ({ id }) => {
  switch (id) {
    case 'workflow':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="6" height="6" rx="1.5" />
          <rect x="15" y="15" width="6" height="6" rx="1.5" />
          <path d="M6 9v3a3 3 0 0 0 3 3h6" />
        </svg>
      );
    case 'analytics':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 16v-4" />
          <path d="M13 16V8" />
          <path d="M18 16v-7" />
        </svg>
      );
    case 'leads':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'bolt':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
        </svg>
      );
    case 'shield':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'globe':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" />
        </svg>
      );
  }
};

const ArrowSvgIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const FEATURE_CARDS: Array<{
  icon: FeatureIconId;
  title: string;
  description: string;
}> = [
  {
    icon: 'workflow',
    title: 'Smart timetables',
    description:
      'Organize weekly and daily lecture slots with room numbers, faculty names, and automatic overlap detection.',
  },
  {
    icon: 'analytics',
    title: 'Live attendance buffer',
    description:
      'Real-time lecture math turns raw attendance logs into the exact number of classes you can skip or recover.',
  },
  {
    icon: 'leads',
    title: 'Exams & weighted marks',
    description:
      'Log quizzes, midterms, practicals, and finals per subject with instant unweighted and weighted score totals.',
  },
  {
    icon: 'bolt',
    title: 'Instant file scanner',
    description:
      'Import class schedules, past attendance logs, and holiday circulars directly from PDFs, photos, CSV, or ICS.',
  },
  {
    icon: 'shield',
    title: 'Protected credentials',
    description:
      'Private local-first workspace with old-password checks and friend-name recovery baked right into your account.',
  },
  {
    icon: 'globe',
    title: 'Notebook kanban',
    description:
      'Spiral-bound study pages and priority sticky notes synced seamlessly with your course assignments.',
  },
];

const DASHBOARD_BAR_HEIGHTS = [62, 88, 47, 95, 71, 80, 58];

const DASHBOARD_ROWS = [
  { label: 'Algorithms', pct: 90 },
  { label: 'Operating Systems', pct: 82 },
  { label: 'Database Systems', pct: 76 },
  { label: 'Computer Networks', pct: 68 },
];

const STAT_ITEMS = [
  { value: '75%+', label: 'Target attendance buffer' },
  { value: '98%', label: 'Schedule scan accuracy' },
  { value: '6-in-1', label: 'Unified study modules' },
  { value: '100%', label: 'Instant offline sync' },
];

const MODULE_WORDMARKS = [
  'Attendance',
  'Timetable',
  'Exams & Marks',
  'Kanban Notes',
  'Holiday Scan',
  'Analytics',
];

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  onLaunchDemo,
  settings,
  customWallpaper,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [friendName, setFriendName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const activeSettings = settings || db.getSettings();
  const activeWallpaper =
    customWallpaper !== undefined ? customWallpaper : db.getCustomWallpaper();
  const showLandingPhoto = Boolean(
    activeSettings.applyPhotoToLanding &&
      activeSettings.backgroundMode === 'photo' &&
      activeWallpaper
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      applyWorkspaceAccentToRoot(document.documentElement.style, activeSettings);
      applyGlassAppearanceToRoot(
        document.documentElement,
        {
          ...activeSettings,
          backgroundMode: showLandingPhoto ? 'photo' : 'space',
        },
        showLandingPhoto
      );
    }
  }, [activeSettings, showLandingPhoto]);

  // Lenis smooth wheel scroll on desktop + staggered IntersectionObserver reveals
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isCoarsePointer =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches;

    let rafId = 0;
    if (!prefersReducedMotion && !isCoarsePointer) {
      const lenis = new Lenis({
        duration: 1.12,
        smoothWheel: true,
        syncTouch: false,
        touchMultiplier: 1.5,
      });
      lenisRef.current = lenis;

      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }

    const rootEl = pageRef.current;
    const revealNodes = rootEl
      ? Array.from(rootEl.querySelectorAll<HTMLElement>('[data-reveal]'))
      : [];

    let observer: IntersectionObserver | null = null;
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      revealNodes.forEach((node) => node.classList.add('in'));
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }
      );
      revealNodes.forEach((node) => observer?.observe(node));
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToSection = (id: string, focusInputId?: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (lenisRef.current && !prefersReducedMotion) {
      lenisRef.current.scrollTo(target, { offset: -20 });
    } else {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }

    if (focusInputId) {
      window.setTimeout(() => {
        document.getElementById(focusInputId)?.focus({ preventScroll: true });
      }, prefersReducedMotion ? 20 : 420);
    }
  };

  const handleQuickDemo = () => {
    if (onLaunchDemo) {
      onLaunchDemo();
      return;
    }
    const demoUser = db.launchDemoSession();
    onLoginSuccess(demoUser, false);
  };

  const currentYear = new Date().getFullYear();
  const isNewUsername =
    username.trim().length > 0 && !db.hasExistingAccount(username.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetSuccessMsg('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMsg('Please enter your username.');
      return;
    }
    if (!trimmedPass) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = db.authenticateOrRegister(trimmedUser, trimmedPass, friendName);
      setLoading(false);

      if (!result.success) {
        setErrorMsg(result.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      setPassword('');
      setFriendName('');
      onLoginSuccess(result.user, result.isNew);
    }, 120);
  };

  const revealDelay = (ms: number): React.CSSProperties =>
    ({ '--rd': `${ms}ms` }) as React.CSSProperties;

  return (
    <div className="relative min-h-screen bg-[#04060f] text-[#f3f6ff] selection:bg-[#5df0a8] selection:text-[#032018]">
      {showLandingPhoto && activeWallpaper ? (
        <CustomPhotoBackground imageUrl={activeWallpaper} settings={activeSettings} />
      ) : (
        <MarsPlanetCanvas />
      )}

      <div className="asc-page" id="top" ref={pageRef}>
        {/* SECTION 1 · HERO + WORKFLOW BAR */}
        <header className="asc-hero">
          <div className="asc-nav">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('top');
              }}
              aria-label="oggytrack"
              className="inline-flex items-center whitespace-nowrap shrink-0"
            >
              <BrandLogo size="md" showText />
            </a>

            <nav className="asc-nav-links" aria-label="Primary sections">
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('features');
                }}
              >
                Features
              </a>
              <a
                href="#solutions"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('solutions');
                }}
              >
                Overview
              </a>
              <a
                href="#stats"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('stats');
                }}
              >
                Metrics
              </a>
              <a
                href="#workspace-signin"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('workspace-signin', 'auth-username-input');
                }}
              >
                Workspace
              </a>
            </nav>

            <button
              type="button"
              onClick={() => scrollToSection('workspace-signin', 'auth-username-input')}
              className="asc-btn asc-btn-ghost"
            >
              Sign In
            </button>
          </div>

          <div className="asc-hero-inner">
            <h1 className="asc-hero-title" data-reveal style={revealDelay(60)}>
              Track Smarter,
              <br />
              Not <em>Harder</em>
            </h1>

            <p className="asc-hero-sub" data-reveal style={revealDelay(180)}>
              Drive your semester forward with live attendance buffers, conflict-free
              timetables, exam marks, and kanban study boards — all in one immersive
              academic command center.
            </p>

            <div className="asc-hero-actions" data-reveal style={revealDelay(300)}>
              <button
                type="button"
                onClick={() => scrollToSection('workspace-signin', 'auth-username-input')}
                className="asc-btn asc-btn-primary"
              >
                <span>Start Free Right Now</span>
                <ArrowSvgIcon />
              </button>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="asc-btn asc-btn-outline"
              >
                Launch Instant Demo
              </button>
            </div>
          </div>

          <div className="asc-logos" data-reveal style={revealDelay(420)}>
            <div className="asc-logos-label">Built for every semester workflow</div>
            <div className="asc-logos-row">
              {MODULE_WORDMARKS.map((item) => (
                <span key={item} className="asc-logo-item">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* SECTION 2 · FEATURES */}
        <section className="asc-section" id="features">
          <div className="asc-section-head">
            <span className="asc-eyebrow" data-reveal style={revealDelay(0)}>
              Everything in orbit
            </span>
            <h2 data-reveal style={revealDelay(80)}>
              One platform to run your entire academic engine
            </h2>
            <p data-reveal style={revealDelay(160)}>
              Stop stitching spreadsheets and campus portals together. oggytrack unifies
              schedules, attendance math, exam grading, and kanban notes into a single
              surface you actually enjoy using.
            </p>
          </div>

          <div className="asc-feature-grid">
            {FEATURE_CARDS.map((card, idx) => (
              <article
                key={card.title}
                className="asc-card"
                data-reveal
                style={revealDelay(idx * 90)}
              >
                <div className="asc-card-icon">
                  <FeatureSvgIcon id={card.icon} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 3 · SHOWCASE + LIVE DASHBOARD + STATS */}
        <section className="asc-section" id="solutions">
          <div className="asc-showcase-grid">
            <div className="asc-showcase-copy">
              <span className="asc-eyebrow" data-reveal style={revealDelay(0)}>
                Built for momentum
              </span>
              <h2 data-reveal style={revealDelay(90)}>
                See your whole semester move in real time
              </h2>
              <p data-reveal style={revealDelay(180)}>
                Every lecture attended, every exam graded, every deadline completed —
                rendered live. Spot attendance dips early and keep every subject safely
                above your target threshold.
              </p>
              <div data-reveal style={revealDelay(270)}>
                <button
                  type="button"
                  onClick={() => scrollToSection('workspace-signin', 'auth-username-input')}
                  className="asc-btn asc-btn-primary"
                >
                  <span>Explore the platform</span>
                  <ArrowSvgIcon />
                </button>
              </div>
            </div>

            <div className="asc-dashboard" data-reveal style={revealDelay(160)}>
              <div className="asc-dash-top">
                <span className="asc-dash-title">Attendance · Semester 4</span>
                <span className="asc-dash-meta">Target 75%+</span>
              </div>

              <div className="asc-dash-bars" aria-label="Weekly lecture attendance trend">
                {DASHBOARD_BAR_HEIGHTS.map((h, idx) => (
                  <div
                    key={idx}
                    className="asc-dash-bar"
                    style={
                      {
                        '--bar-h': `${h}%`,
                        '--bar-d': `${idx * 90}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>

              <div className="asc-dash-rows">
                {DASHBOARD_ROWS.map((row) => (
                  <div key={row.label} className="asc-dash-row">
                    <span className="truncate">{row.label}</span>
                    <div className="asc-dash-track">
                      <div
                        className="asc-dash-fill"
                        style={{ '--w': `${row.pct}%` } as React.CSSProperties}
                      />
                    </div>
                    <span className="text-right font-semibold text-[#f3f6ff]">
                      {row.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="asc-stats" id="stats">
            {STAT_ITEMS.map((stat, idx) => (
              <div
                key={stat.label}
                className="asc-stat"
                data-reveal
                style={revealDelay(idx * 80)}
              >
                <div className="asc-stat-value">{stat.value}</div>
                <div className="asc-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4 · WORKSPACE SIGN-IN CTA + FOOTER */}
        <section className="asc-section" id="workspace-signin">
          <div className="asc-cta-card">
            <span className="asc-eyebrow" data-reveal style={revealDelay(60)}>
              Ready when you are
            </span>
            <h2 data-reveal style={revealDelay(140)}>
              Put your semester on a new trajectory
            </h2>
            <p data-reveal style={revealDelay(220)}>
              Enter your username and password below to sign in or create your personal
              student workspace in seconds. Stored locally and private by default.
            </p>

            <div className="asc-signin-box" data-reveal style={revealDelay(300)}>
              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {resetSuccessMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="auth-username-input"
                    className="block text-xs font-semibold text-[#f3f6ff]/85 mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa6c4] pointer-events-none" />
                    <input
                      id="auth-username-input"
                      type="text"
                      required
                      placeholder="e.g. alex"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="asc-input w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password-input"
                      className="block text-xs font-semibold text-[#f3f6ff]/85"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#9aa6c4] hover:text-[#5df0a8] flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa6c4] pointer-events-none" />
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="asc-input w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl font-medium"
                    />
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-semibold text-[#5df0a8] hover:text-[#8ff7c4] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {isNewUsername && (
                  <div className="animate-fade-in">
                    <label
                      htmlFor="auth-friend-name-input"
                      className="block text-xs font-semibold text-[#f3f6ff]/85 mb-1.5"
                    >
                      Friend's Name (for Password Recovery)
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa6c4] pointer-events-none" />
                      <input
                        id="auth-friend-name-input"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="off"
                        placeholder="Secret recovery friend's name (hashed locally)"
                        value={friendName}
                        onChange={(e) => setFriendName(e.target.value)}
                        className="asc-input w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl font-medium"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="asc-btn asc-btn-primary flex-1"
                  >
                    {loading ? (
                      <span>Opening Workspace...</span>
                    ) : (
                      <>
                        <span>Sign In & Launch Workspace</span>
                        <ArrowSvgIcon />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickDemo}
                    className="asc-btn asc-btn-outline sm:w-auto"
                  >
                    Demo Mode
                  </button>
                </div>

                <p className="text-[11px] text-[#9aa6c4] leading-relaxed text-center pt-1">
                  First-time sign in with a new username creates your account and opens the
                  step-by-step semester setup guide.
                </p>
              </form>
            </div>
          </div>

          <footer className="asc-footer">
            <div className="asc-footer-brand">
              <BrandLogo size="md" showText />
              <p>The academic command center for ambitious students.</p>
            </div>

            <div className="asc-footer-cols">
              <div className="asc-footer-col">
                <h4>Product</h4>
                <ul>
                  <li>
                    <a
                      href="#features"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('features');
                      }}
                    >
                      Features
                    </a>
                  </li>
                  <li>
                    <a
                      href="#solutions"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('solutions');
                      }}
                    >
                      Overview
                    </a>
                  </li>
                  <li>
                    <button type="button" onClick={handleQuickDemo}>
                      Demo Workspace
                    </button>
                  </li>
                </ul>
              </div>

              <div className="asc-footer-col">
                <h4>Modules</h4>
                <ul>
                  <li>
                    <a
                      href="#features"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('features');
                      }}
                    >
                      Attendance & Timetable
                    </a>
                  </li>
                  <li>
                    <a
                      href="#features"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('features');
                      }}
                    >
                      Exams & Marks
                    </a>
                  </li>
                  <li>
                    <a
                      href="#features"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('features');
                      }}
                    >
                      Notebook Kanban
                    </a>
                  </li>
                </ul>
              </div>

              <div className="asc-footer-col">
                <h4>Account</h4>
                <ul>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('workspace-signin', 'auth-username-input')}
                    >
                      Sign In
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setShowForgotModal(true);
                      }}
                    >
                      Password Recovery
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('workspace-signin', 'auth-username-input')}
                    >
                      Local Privacy
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </footer>

          <div className="asc-copyright">
            © {currentYear} oggytrack — Built among the stars.
          </div>
        </section>
      </div>

      {showForgotModal && (
        <ForgotPasswordModal
          initialUsername={username}
          onClose={() => setShowForgotModal(false)}
          onResetSuccess={(recoveredUser) => {
            setUsername(recoveredUser);
            setPassword('');
            setErrorMsg('');
            setResetSuccessMsg('Password updated! Enter your new password below to sign in.');
            setShowForgotModal(false);
            scrollToSection('workspace-signin', 'auth-password-input');
          }}
        />
      )}
    </div>
  );
};
