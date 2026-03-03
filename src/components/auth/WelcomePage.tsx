import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Shield,
  ArrowRight,
  Check,
  Flame,
  DoorOpen,
  Home,
  Layers,
  Square,
} from "lucide-react";
import { getSupabaseUrl, getSupabaseAnonKey, isDebugEnabled } from "../../lib/env";
import { supabase } from "../../lib/supabase";

interface MeasureType {
  id: string;
  name: string;
  code: string;
  description: string;
  icon_name: string;
  color_class: string;
}

const iconMap: Record<string, React.ElementType> = {
  flame: Flame,
  "door-open": DoorOpen,
  home: Home,
  layers: Layers,
  square: Square,
};

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  barColor: string;
} {
  if (!password) return { score: 0, label: "", color: "", barColor: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "text-red-400", barColor: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "text-amber-400", barColor: "bg-amber-500" };
  if (score <= 3) return { score, label: "Good", color: "text-yellow-400", barColor: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "text-emerald-400", barColor: "bg-emerald-500" };
  return { score, label: "Very strong", color: "text-emerald-400", barColor: "bg-emerald-600" };
}

export function WelcomePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = useMemo(() => {
    return searchParams.get("session_id") || searchParams.get("sessionId") || "";
  }, [searchParams]);

  const isTestMode = sessionId === "test_preview";

  const [email, setEmail] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [measures, setMeasures] = useState<MeasureType[]>([]);
  const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setError("");
        setLoadingInit(true);

        if (!sessionId) {
          throw new Error("Missing session ID. Please return to pricing.");
        }

        if (isTestMode) {
          setEmail("test@example.com");
          setOrganisationName("Test Organisation");
          if (supabase) {
            const { data } = await supabase
              .from("measure_types")
              .select("id, name, code, description, icon_name, color_class")
              .eq("is_active", true)
              .order("name");
            if (mounted) setMeasures(data || []);
          }
          return;
        }

        const supabaseUrl = getSupabaseUrl();
        const anonKey = getSupabaseAnonKey();

        if (!supabaseUrl || !anonKey) throw new Error("App configuration error");

        const sessionRes = await fetch(`${supabaseUrl}/functions/v1/complete-registration?sessionId=${encodeURIComponent(sessionId)}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        });

        if (!sessionRes.ok) {
          const text = await sessionRes.text();
          const parsed = (() => { try { return JSON.parse(text); } catch { return null; } })();
          throw new Error(parsed?.error || `HTTP ${sessionRes.status}`);
        }

        const sessionData = await sessionRes.json();

        if (!mounted) return;
        setEmail(sessionData.email || "");
        setOrganisationName(sessionData.organisationName || "");
        setMeasures(sessionData.measures || []);
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.message ?? "";
        const isNetworkError = e instanceof TypeError || msg.includes("Failed to fetch") || msg.includes("ERR_NAME_NOT_RESOLVED");
        setError(isNetworkError ? "Network error: Unable to reach server. Please check your connection." : msg || "Failed to load registration session");
        if (isDebugEnabled()) console.error("Init error:", e);
      } finally {
        if (mounted) setLoadingInit(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, [sessionId, isTestMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!sessionId) { setError("Invalid or missing registration session."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!selectedMeasureId) { setError("Please select a measure type to continue."); return; }

    if (isTestMode) {
      navigate("/login", { replace: true });
      return;
    }

    setSubmitting(true);

    try {
      const supabaseUrl = getSupabaseUrl();
      const anonKey = getSupabaseAnonKey();

      if (!supabaseUrl || !anonKey) throw new Error("App configuration error.");

      const regRes = await fetch(`${supabaseUrl}/functions/v1/complete-registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ sessionId, password, email, organisationName }),
      });

      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok) throw new Error(regData.error || `Registration failed (HTTP ${regRes.status})`);

      if (regData.session && supabase) {
        await supabase.auth.setSession({
          access_token: regData.session.access_token,
          refresh_token: regData.session.refresh_token,
        });
      }

      const measureRes = await fetch(`${supabaseUrl}/functions/v1/save-organisation-measure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ sessionId, measureTypeId: selectedMeasureId }),
      });

      const measureData = await measureRes.json().catch(() => ({}));
      if (!measureRes.ok) throw new Error(measureData.error || "Failed to save measure selection");

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      if (isDebugEnabled()) console.error("Submit error:", err);
      setError(err.message || "Failed to complete setup. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,175,255,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,175,255,0.08),transparent_50%)]" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-electric-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-electric-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      {isTestMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 backdrop-blur-sm text-amber-950 text-xs font-semibold text-center py-2 px-4">
          TEST PREVIEW MODE — No data will be saved.
        </div>
      )}

      <div className={`relative w-full max-w-2xl ${isTestMode ? "mt-8" : ""}`}>
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-electric-500/20 blur-2xl rounded-full scale-150" />
            <img src="/brand/image.png" alt="CapturePro" className="relative w-20 h-20 object-contain drop-shadow-2xl" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Capture<span className="text-electric-400">Pro</span>
          </h1>
          <p className="text-gray-400 text-sm">Complete your account setup below</p>
          <div className="flex items-center justify-center gap-1.5 mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 w-fit mx-auto">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Payment confirmed</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

            {loadingInit ? (
              <div className="p-8 space-y-4">
                <div className="h-5 bg-white/10 rounded animate-pulse w-1/3" />
                <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-px bg-white/5 my-2" />
                <div className="h-5 bg-white/10 rounded animate-pulse w-1/3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse" />
                  ))}
                </div>
                <div className="h-12 bg-white/10 rounded-xl animate-pulse mt-2" />
              </div>
            ) : error && !submitting && !email ? (
              <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-sm text-electric-400 hover:text-electric-300 transition-colors block mx-auto"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <div className="p-8 border-b border-white/[0.06]">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-electric-400" />
                    Set Your Password
                  </h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          readOnly
                          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 text-sm cursor-default select-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Organisation</label>
                        <input
                          type="text"
                          value={organisationName}
                          onChange={(e) => setOrganisationName(e.target.value)}
                          placeholder="Your company name"
                          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-500/50 focus:border-electric-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            placeholder="Create a password"
                            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-500/50 focus:border-electric-500/50 transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {password && (
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                  key={i}
                                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.score ? passwordStrength.barColor : "bg-white/10"}`}
                                />
                              ))}
                            </div>
                            <p className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            placeholder="Repeat your password"
                            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-500/50 focus:border-electric-500/50 transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            tabIndex={-1}
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPassword && !passwordsMatch && (
                          <p className="text-xs text-red-400 font-medium mt-1.5">Passwords do not match</p>
                        )}
                        {confirmPassword && passwordsMatch && confirmPassword.length > 0 && (
                          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-1.5">
                            <CheckCircle className="w-3 h-3" /> Passwords match
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-b border-white/[0.06]">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-electric-400" />
                    Choose Your Starting Measure
                  </h2>
                  <p className="text-xs text-gray-500 mb-5">Select the primary measure type for your organisation. You can add more later.</p>

                  {measures.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">No measures available. Please contact support.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {measures.map((measure) => {
                        const Icon = iconMap[measure.icon_name] || Square;
                        const isSelected = selectedMeasureId === measure.id;
                        const isExternalCladding = measure.code === "external_cladding_nf";

                        return (
                          <button
                            key={measure.id}
                            type="button"
                            onClick={() => setSelectedMeasureId(measure.id)}
                            className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                              isSelected
                                ? "border-electric-500 bg-electric-500/10 shadow-lg shadow-electric-500/10 ring-1 ring-electric-500/30"
                                : "border-white/10 bg-white/[0.04] hover:border-electric-500/40 hover:bg-white/[0.07]"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2.5 right-2.5">
                                <div className="w-5 h-5 rounded-full bg-electric-500 flex items-center justify-center shadow-lg shadow-electric-500/30">
                                  <Check size={12} className="text-white" />
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2.5 mb-2">
                              <div className={`p-2 rounded-lg ${isSelected ? "bg-electric-500/20" : "bg-white/[0.07]"}`}>
                                <Icon size={18} className={isSelected ? "text-electric-400" : "text-gray-400"} />
                              </div>
                              <div>
                                <h3 className={`text-sm font-semibold leading-tight ${isSelected ? "text-white" : "text-gray-200"}`}>
                                  {measure.name}
                                </h3>
                                {isExternalCladding && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full">
                                    Non Funded
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                              {measure.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-8">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !passwordsMatch || password.length < 8 || !selectedMeasureId}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-electric-500 hover:bg-electric-600 text-white font-semibold shadow-lg shadow-electric-500/25 hover:shadow-electric-500/40 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Setting up your account...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Your data is encrypted and secure</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
