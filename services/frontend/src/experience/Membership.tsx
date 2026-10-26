import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { Brand, Icon } from "./Icons";
import { PublicNav } from "./PublicSite";

type MembershipStatus = {
  state:
    | "disabled"
    | "free"
    | "transition"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled";
  hasAcademyAccess: boolean;
  checkoutEnabled: boolean;
  enforcementEnabled: boolean;
  price: { amount: number; currency: string; interval: string };
  trialDays: number;
  transitionEndsAt?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  cancelAtPeriodEnd: boolean;
};

export function Pricing() {
  const user = useAuthStore((state) => state.user),
    [params] = useSearchParams(),
    returnTo = useMemo(() => {
      const value = params.get("returnTo");
      return value && /^\/(?!\/)/.test(value) ? value : "/app/learn";
    }, [params]),
    [status, setStatus] = useState<MembershipStatus | null>(null),
    [error, setError] = useState(""),
    [starting, setStarting] = useState(false);
  useEffect(() => {
    if (user)
      api
        .get("/billing/status")
        .then((response) => setStatus(response.data))
        .catch(() => setError("Membership status could not be loaded."));
  }, [user]);
  async function checkout() {
    setStarting(true);
    setError("");
    try {
      const response = await api.post("/billing/checkout", { returnTo });
      if (response.data.url) window.location.assign(response.data.url);
    } catch (failure: any) {
      setError(
        failure.response?.data?.error || "Checkout could not be started.",
      );
    } finally {
      setStarting(false);
    }
  }
  const cta = !user ? (
    <Link
      className="button primary large"
      to={`/register?returnTo=${encodeURIComponent(`/pricing?returnTo=${encodeURIComponent(returnTo)}`)}`}
    >
      Create account to begin <Icon name="arrow" />
    </Link>
  ) : status?.hasAcademyAccess ? (
    <Link className="button primary large" to={returnTo}>
      Open the academy <Icon name="arrow" />
    </Link>
  ) : (
    <button
      className="button primary large"
      disabled={starting || !status?.checkoutEnabled}
      onClick={() => void checkout()}
    >
      {starting
        ? "Opening secure checkout…"
        : status?.checkoutEnabled
          ? "Start your 7-day trial"
          : "Checkout opens after launch readiness"}
      <Icon name="arrow" />
    </button>
  );
  return (
    <div className="public-site public-inner">
      <PublicNav />
      <main className="pricing-page">
        <section>
          <p className="kicker">PERBILLION ACADEMY</p>
          <h1>
            Learn the idea.
            <br />
            <span>Practice the decision.</span>
          </h1>
          <p>
            Twenty-four visual lessons, fictional market practice, twelve guided
            weekly missions, and a private decision journal.
          </p>
        </section>
        <div className="pricing-grid">
          <article className="price-card price-card-featured">
            <span>ACADEMY MEMBERSHIP</span>
            <div>
              <strong>$29</strong>
              <small>/ month</small>
            </div>
            <p>
              A card-required 7-day trial. Cancel in the billing portal before
              renewal.
            </p>
            <ul>
              <li>Four complete learning tracks</li>
              <li>Interactive examples and server-scored assessments</li>
              <li>Portfolio practice and debriefs</li>
              <li>Twelve guided missions</li>
              <li>Synced progress and private reflections</li>
            </ul>
            {cta}
            {error && (
              <p className="status error" role="alert">
                {error}
              </p>
            )}
            <small>
              Live stock forecasting remains a separate, capacity-limited beta.
            </small>
          </article>
          <aside>
            <p className="kicker">THREE COMPLETE PREVIEWS</p>
            <h2>Understand the experience before you subscribe.</h2>
            {[
              ["money-to-investing", "Your money, with a future"],
              ["compound-interest", "The quiet power of compounding"],
              ["diversification", "One portfolio. Many possibilities."],
            ].map(([id, title]) => (
              <Link key={id} to={`/learn/${id}`}>
                <span>{title}</span>
                <Icon name="arrow" />
              </Link>
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
}

export function Billing() {
  const [status, setStatus] = useState<MembershipStatus | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/billing/status")
      .then((response) => setStatus(response.data))
      .catch(() => setError("Membership status could not be loaded."))
      .finally(() => setLoading(false));
  }, []);
  async function portal() {
    try {
      const response = await api.post("/billing/portal");
      if (response.data.url) window.location.assign(response.data.url);
    } catch (failure: any) {
      setError(
        failure.response?.data?.error || "Billing management is unavailable.",
      );
    }
  }
  if (loading)
    return (
      <div className="route-loading" role="status">
        <span />
        Loading membership…
      </div>
    );
  return (
    <div className="product-page billing-page">
      <header className="product-head">
        <div>
          <p className="kicker">MEMBERSHIP</p>
          <h1>Your academy access.</h1>
          <p>
            See your current access and manage billing through Stripe’s secure
            portal.
          </p>
        </div>
      </header>
      <section className="panel billing-status-card">
        <span className={`membership-state state-${status?.state}`}>
          {status?.state === "disabled" ? "Pre-launch access" : status?.state}
        </span>
        <h2>
          {status?.hasAcademyAccess
            ? "The academy is open."
            : "Your membership is inactive."}
        </h2>
        <p>
          {status?.trialEndsAt
            ? `Trial ends ${new Date(status.trialEndsAt).toLocaleDateString()}.`
            : status?.currentPeriodEndsAt
              ? `${status.cancelAtPeriodEnd ? "Access ends" : "Renews"} ${new Date(status.currentPeriodEndsAt).toLocaleDateString()}.`
              : status?.transitionEndsAt
                ? `Transition access continues until ${new Date(status.transitionEndsAt).toLocaleDateString()}.`
                : "Membership is $29 per month after a 7-day trial."}
        </p>
        <div>
          {status?.state === "active" || status?.state === "trialing" ? (
            <button
              className="button button-gold"
              onClick={() => void portal()}
            >
              Manage membership <Icon name="arrow" />
            </button>
          ) : (
            <Link className="button button-gold" to="/pricing">
              Explore membership <Icon name="arrow" />
            </Link>
          )}
        </div>
        {error && (
          <p className="status error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

export function CheckoutReturn() {
  const user = useAuthStore((state) => state.user),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    [state, setState] = useState<"confirming" | "ready" | "error">(
      "confirming",
    ),
    [message, setMessage] = useState("Confirming your membership…");
  const sessionId = params.get("session_id") || "",
    rawReturn = params.get("returnTo") || "/app/learn",
    returnTo = /^\/(?!\/)/.test(rawReturn) ? rawReturn : "/app/learn";
  useEffect(() => {
    if (!user) {
      setState("error");
      setMessage(
        "Sign in with the account that started checkout to confirm access.",
      );
      return;
    }
    api
      .post("/billing/checkout/confirm", { sessionId })
      .then(() => {
        setState("ready");
        setMessage("Your academy is ready.");
      })
      .catch((failure) => {
        setState("error");
        setMessage(
          failure.response?.data?.error ||
            "Membership confirmation is still pending. Refresh shortly.",
        );
      });
  }, [sessionId, user]);
  return (
    <div className="public-site checkout-return">
      <Brand />
      <main>
        <span className="eyebrow">SECURE CHECKOUT</span>
        <h1>{message}</h1>
        {state === "confirming" && (
          <div className="route-loading" role="status">
            <span />
            Checking Stripe…
          </div>
        )}
        {state === "ready" && (
          <button
            className="button primary large"
            onClick={() => navigate(returnTo, { replace: true })}
          >
            Continue <Icon name="arrow" />
          </button>
        )}
        {state === "error" && (
          <div>
            <Link
              className="button primary"
              to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
            >
              Sign in
            </Link>
            <Link className="button quiet" to="/pricing">
              Return to membership
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
