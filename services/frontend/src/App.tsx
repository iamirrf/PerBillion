import { Component, lazy, Suspense, type ReactNode, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useLearningStore } from "./experience/learningStore";
import { lessons } from "./experience/curriculumCatalog";
import PublicSite from "./experience/PublicSite";
import Legal from "./experience/Legal";
import {
  NotFound,
  PublicLearn,
  PublicLesson,
  PublicPractice,
  PublicResearch,
} from "./experience/PublicPages";
import { Billing, CheckoutReturn, Pricing } from "./experience/Membership";
import api from "./lib/api";

const Shell = lazy(() => import("./experience/Shell")),
  Overview = lazy(() => import("./experience/Overview")),
  Learn = lazy(() => import("./experience/Learn")),
  Practice = lazy(() => import("./experience/Practice")),
  Research = lazy(() => import("./experience/Research")),
  Progress = lazy(() => import("./experience/Progress")),
  Onboarding = lazy(() => import("./experience/Onboarding"));
const Account = lazy(() =>
    import("./experience/Account").then((m) => ({ default: m.Profile })),
  ),
  Login = lazy(() =>
    import("./experience/Account").then((m) => ({ default: m.Login })),
  ),
  Register = lazy(() =>
    import("./experience/Account").then((m) => ({ default: m.Register })),
  ),
  ForgotPassword = lazy(() =>
    import("./experience/Account").then((m) => ({ default: m.ForgotPassword })),
  ),
  ResetPassword = lazy(() =>
    import("./experience/Account").then((m) => ({ default: m.ResetPassword })),
  ),
  VerifyEmail = lazy(() =>
    import("./experience/Account").then((m) => ({
      default: () => <m.ResetPassword verify />,
    })),
  );
const Missions = lazy(() => import("./experience/Missions"));
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="recovery">
        <h1>Let’s get you back.</h1>
        <p>Your account data is safe. Reload to reconnect.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload PerBillion
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Loading() {
  return (
    <div className="route-loading" role="status">
      <span />
      Loading your workspace…
    </div>
  );
}
function SessionRestore() {
  const ready = useAuthStore((s) => s._hasHydrated),
    user = useAuthStore((s) => s.user),
    token = useAuthStore((s) => s.token),
    csrfToken = useAuthStore((s) => s.csrfToken),
    setAuth = useAuthStore((s) => s.setAuth),
    logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    if (!ready || csrfToken) return;
    let active = true;
    const request =
      token && user
        ? api
            .post("/auth/session/upgrade")
            .then((response) => ({
              user,
              csrfToken: response.data?.session?.csrfToken,
            }))
        : api.get("/auth/session").then((response) => response.data);
    request
      .then((data) => {
        if (active && data?.user && data?.csrfToken)
          setAuth(data.user, null, data.csrfToken);
      })
      .catch(() => {
        if (active && user && !token) logout();
      });
    return () => {
      active = false;
    };
  }, [ready, token, csrfToken, user, setAuth, logout]);
  return null;
}
function Guard({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token),
    user = useAuthStore((s) => s.user),
    ready = useAuthStore((s) => s._hasHydrated),
    where = useLocation();
  if (!ready) return <Loading />;
  return token || user ? (
    <>{children}</>
  ) : (
    <Navigate
      replace
      to={`/login?returnTo=${encodeURIComponent(where.pathname + where.search)}`}
    />
  );
}
function Legacy() {
  const location = useLocation(),
    q = new URLSearchParams(location.search);
  let target = "/app";
  if (location.pathname === "/education") {
    const id = q.get("lesson"),
      track = q.get("track");
    target =
      id && lessons.some((item) => item.id === id)
        ? `/app/learn/${id}`
        : track &&
            ["foundations", "portfolio", "trading", "quant"].includes(track)
          ? `/app/learn?track=${track}`
          : "/app/learn";
  } else if (location.pathname === "/forecast") {
    const tool = q.get("tool") || q.get("tab");
    target = `/app/practice/${["growth", "portfolio", "scenarios"].includes(tool || "") ? tool : "portfolio"}`;
  } else if (location.pathname === "/quant") {
    const kept = new URLSearchParams();
    const ticker = q.get("ticker")?.toUpperCase(),
      horizon = Number(q.get("horizon")),
      model = q.get("model");
    if (ticker && /^[A-Z]{1,5}$/.test(ticker)) kept.set("ticker", ticker);
    if (Number.isInteger(horizon) && horizon >= 1 && horizon <= 52)
      kept.set("horizon", String(horizon));
    if (
      model &&
      [
        "auto",
        "ARIMA",
        "SARIMA",
        "SARIMAX",
        "HOLT_WINTERS_ADDITIVE",
        "HOLT_WINTERS_MULTIPLICATIVE",
        "HOLT_WINTERS_DAMPED",
      ].includes(model)
    )
      kept.set("model", model);
    target = `/app/research${kept.size ? `?${kept}` : ""}`;
  } else if (location.pathname === "/progress") target = "/app/progress";
  else if (location.pathname === "/profile") target = "/app/account";
  return <Navigate replace to={target} />;
}
function RouteEffects() {
  const { pathname: rawPathname } = useLocation(),
    pathname =
      rawPathname.length > 1 && rawPathname.endsWith("/")
        ? rawPathname.slice(0, -1)
        : rawPathname;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    const lesson = lessons.find((item) => pathname.endsWith(`/${item.id}`));
    const map: Record<string, [string, string]> = {
      "/": [
        "Understand investing. Put it into practice.",
        "Learn investing through clear lessons, simulated portfolios, and transparent statistical research.",
      ],
      "/learn": [
        "Investing Academy",
        "Explore 24 focused investing lessons and three complete free previews.",
      ],
      "/practice": [
        "Practice investing decisions",
        "Test ideas with fictional assets, virtual cash, and repeatable scenarios.",
      ],
      "/research": [
        "Transparent forecast research",
        "Explore weekly statistical forecasts, uncertainty, validation, and source provenance.",
      ],
      "/pricing": [
        "Academy membership",
        "Explore 24 lessons, simulated practice, and 12 weekly missions after a seven-day trial.",
      ],
      "/about": [
        "About PerBillion",
        "Why PerBillion connects financial learning, practice, and research.",
      ],
      "/privacy": [
        "Privacy",
        "How PerBillion handles account and learning data.",
      ],
      "/terms": [
        "Terms",
        "Terms for using PerBillion’s educational tools and simulations.",
      ],
      "/login": [
        "Welcome back",
        "Sign in to continue learning, practicing, and researching.",
      ],
      "/register": ["Create your account", "Create a free PerBillion account."],
      "/forgot-password": [
        "Reset your password",
        "Request a secure PerBillion password reset link.",
      ],
      "/reset-password": [
        "Choose a new password",
        "Securely reset your PerBillion password.",
      ],
      "/verify-email": [
        "Verify your email",
        "Verify your email for live PerBillion research.",
      ],
    };
    const fallback = pathname.startsWith("/app/research")
      ? ["Research", "Build and compare transparent statistical forecasts."]
      : pathname.startsWith("/app/practice")
        ? [
            "Practice",
            "Test investing ideas with fictional assets and virtual money.",
          ]
        : pathname.startsWith("/app/learn")
          ? [
              "Learn",
              "Build investing knowledge through 24 interactive lessons.",
            ]
          : pathname.startsWith("/app/progress")
            ? ["Progress", "Review your learning progress and next steps."]
            : pathname.startsWith("/app/account")
              ? ["Account", "Manage your PerBillion account and data."]
              : [
                  "Page not found",
                  "Return to the PerBillion academy or your workspace.",
                ];
    const [name, description] = lesson
        ? [lesson.title, lesson.description]
        : map[pathname] || fallback,
      title = `${name} · PerBillion`,
      canonical = new URL(pathname, location.origin).href;
    document.title = title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", canonical);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", title);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", description);
    document
      .querySelector('meta[property="og:url"]')
      ?.setAttribute("content", canonical);
    document
      .querySelector('meta[name="twitter:title"]')
      ?.setAttribute("content", title);
    document
      .querySelector('meta[name="twitter:description"]')
      ?.setAttribute("content", description);
  }, [pathname]);
  return null;
}
function Connection() {
  const id = useAuthStore((s) => s.user?.id || null),
    epoch = useLearningStore((s) => s.syncEpoch),
    activate = useLearningStore((s) => s.activateAccount),
    sync = useLearningStore((s) => s.synchronize);
  useEffect(() => activate(id), [id, activate]);
  useEffect(() => {
    if (id) void sync();
  }, [id, epoch, sync]);
  return null;
}
function MotionPreference() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = (explicit?: boolean) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("perbillion-reduced-motion");
      } catch {
        /* System preference remains available. */
      }
      const reduced =
        explicit ?? (stored === null ? media.matches : stored === "true");
      document.documentElement.dataset.reducedMotion = String(reduced);
    };
    const system = () => apply();
    const custom = (event: Event) =>
      apply(Boolean((event as CustomEvent).detail));
    apply();
    media.addEventListener("change", system);
    window.addEventListener("perbillion-motion-change", custom);
    return () => {
      media.removeEventListener("change", system);
      window.removeEventListener("perbillion-motion-change", custom);
    };
  }, []);
  return null;
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MotionPreference />
        <SessionRestore />
        <Connection />
        <RouteEffects />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<PublicSite />} />
            <Route path="/learn" element={<PublicLearn />} />
            <Route path="/learn/:lessonId" element={<PublicLesson />} />
            <Route path="/practice" element={<PublicPractice />} />
            <Route path="/research" element={<PublicResearch />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/about" element={<Legal page="about" />} />
            <Route path="/privacy" element={<Legal page="privacy" />} />
            <Route path="/terms" element={<Legal page="terms" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route
              path="/app/*"
              element={
                <Guard>
                  <Shell>
                    <Routes>
                      <Route index element={<Overview />} />
                      <Route path="onboarding" element={<Onboarding />} />
                      <Route path="learn" element={<Learn />} />
                      <Route path="learn/:lessonId" element={<Learn />} />
                      <Route path="missions" element={<Missions />} />
                      <Route
                        path="practice"
                        element={<Navigate replace to="portfolio" />}
                      />
                      <Route path="practice/:tool" element={<Practice />} />
                      <Route path="research" element={<Research />} />
                      <Route path="research/:view" element={<Research />} />
                      <Route path="progress" element={<Progress />} />
                      <Route path="billing" element={<Billing />} />
                      <Route path="account" element={<Account />} />
                      <Route
                        path="*"
                        element={<Navigate replace to="/app" />}
                      />
                    </Routes>
                  </Shell>
                </Guard>
              }
            />
            <Route path="/home" element={<Legacy />} />
            <Route path="/dashboard" element={<Legacy />} />
            <Route path="/education" element={<Legacy />} />
            <Route path="/forecast" element={<Legacy />} />
            <Route path="/quant" element={<Legacy />} />
            <Route path="/progress" element={<Legacy />} />
            <Route path="/profile" element={<Legacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
