import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login(email, password);
    const token = useAuthStore.getState().token;
    if (token) navigate("/");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-surface-950 relative overflow-hidden flex-col justify-between p-12">
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary-500/5 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-primary-500/25">
              F
            </div>
            <span className="text-xl font-bold text-white tracking-tight">FuelSewa</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold text-white tracking-tight leading-tight mb-4">
            Manage your fuel delivery
            <span className="text-primary-400"> business</span> with ease.
          </h2>
          <p className="text-surface-400 text-[15px] leading-relaxed">
            Monitor orders, manage drivers, track deliveries, and control pricing — all from one powerful admin dashboard.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {["Real-time Tracking", "Driver Management", "Smart Pricing", "Analytics"].map((f) => (
              <span
                key={f}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] text-surface-300 border border-white/[0.06]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-surface-600">© {new Date().getFullYear()} FuelSewa. All rights reserved.</p>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px] animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-bold text-white shadow-lg shadow-primary-500/25">
              F
            </div>
            <span className="text-lg font-bold text-surface-900 tracking-tight">FuelSewa</span>
          </div>

          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Welcome back</h1>
          <p className="text-sm text-surface-400 mt-1.5 mb-8">Sign in to your admin dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-surface-700 mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fuelsewa.com"
                autoComplete="email"
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-surface-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 pr-11 text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-all duration-150"
                  tabIndex={-1}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-xs" />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-danger-50 border border-danger-100 rounded-xl animate-fade-in-down">
                <div className="w-5 h-5 rounded-full bg-danger-500/10 flex items-center justify-center shrink-0">
                  <span className="text-danger-500 text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative bg-surface-900 hover:bg-surface-800 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group shadow-lg shadow-surface-900/10 hover:shadow-xl hover:shadow-surface-900/15 active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-200" />
            <span className="text-xs text-surface-400 font-medium">FuelSewa Admin v2.0</span>
            <div className="flex-1 h-px bg-surface-200" />
          </div>

          <p className="text-center text-xs text-surface-400">
            Need help? Contact{" "}
            <a href="mailto:support@fuelsewa.com" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
              support@fuelsewa.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
