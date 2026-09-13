import React, { useState, useEffect, useRef, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/ui/navbar';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardDescription, CardContent } from '../components/ui/card';
import {
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  AtSign,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Login() {
  const { user, login, register, devBypass } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab state: 'login' or 'register' (honors location.state?.defaultTab or location.state?.tab)
  const initialTab = location.state?.defaultTab || location.state?.tab || 'login';
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (location.state?.defaultTab) {
      setTab(location.state.defaultTab);
    } else if (location.state?.tab) {
      setTab(location.state.tab);
    }
  }, [location.state]);

  // Form input states
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [esoHandle, setEsoHandle] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryInputRef = useRef(null);
  const formId = useId();

  // Auto-focus primary input on load and tab change
  useEffect(() => {
    if (primaryInputRef.current) {
      primaryInputRef.current.focus();
    }
  }, [tab]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/marketplace';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const validateForm = () => {
    setError('');
    if (tab === 'login') {
      if (!usernameOrEmail.trim()) {
        setError('Please enter your username or email address.');
        return false;
      }
      if (!password) {
        setError('Please enter your password.');
        return false;
      }
    } else {
      if (!username.trim() || username.trim().length < 3 || username.trim().length > 32) {
        setError('Username must be between 3 and 32 alphanumeric characters.');
        return false;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
        setError('Username may only contain letters, numbers, hyphens, and underscores.');
        return false;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please provide a valid email address.');
        return false;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return false;
      }
      if (password.length > 128) {
        setError('Password cannot exceed 128 characters.');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (tab === 'login') {
        const res = await login(usernameOrEmail.trim(), password);
        if (res.success) {
          setSuccessMsg('Welcome back to ESO Marketplace!');
          setTimeout(() => navigate(location.state?.from?.pathname || '/marketplace'), 400);
        } else {
          setError(res.error || 'Authentication failed. Please check your credentials.');
        }
      } else {
        const res = await register(
          username.trim(),
          email.trim(),
          password,
          esoHandle.trim() ? (esoHandle.startsWith('@') ? esoHandle.trim() : `@${esoHandle.trim()}`) : null
        );
        if (res.success) {
          setSuccessMsg('Account created successfully! Entering the Marketplace...');
          setTimeout(() => navigate('/marketplace'), 400);
        } else {
          setError(res.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevQuickLogin = async (userId) => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await devBypass(userId);
      if (res.success) {
        setSuccessMsg(res.message || 'Authenticated via Developer Bypass.');
        setTimeout(() => navigate(location.state?.from?.pathname || '/marketplace'), 400);
      } else {
        setError(res.error || 'Bypass failed.');
      }
    } catch (err) {
      setError(err.message || 'Developer bypass error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="exchange-page exchange-auth">
      <Navbar />

      <main className="exchange-container flex-1 flex items-start justify-center py-8 sm:py-12 relative">
        {/* Ambient atmospheric backdrop */}
        <div className="exchange-auth-backdrop" aria-hidden="true" />

        <div className="max-w-lg w-full relative z-10">
          <Card className="exchange-frame overflow-visible">
            {/* Top gold embellishment line */}
            <div className="h-px bg-primary/30" aria-hidden="true" />

            <CardHeader className="px-6 pt-7 pb-5">
              <div className="inline-flex p-3 bg-recess border border-primary/40 mb-2 mr-auto text-primary">
                {tab === 'login' ? <LogIn className="size-6" /> : <UserPlus className="size-6" />}
              </div>

              <h1 className="font-cinzel text-3xl font-normal text-foreground">
                {tab === 'login' ? 'Welcome back' : 'Create an account'}
              </h1>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm mt-1">
                {tab === 'login'
                  ? 'Sign in to ESO Marketplace to manage your characters and saved searches.'
                  : 'Join ESO Marketplace to manage your characters and sync in-game scans.'}
              </CardDescription>

              {/* Tab Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-recess border border-border p-1 mt-5">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
                  aria-pressed={tab === 'login'}
                  className={`py-2 text-xs font-sans font-bold   transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'login'
                      ? 'bg-primary text-recess shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <LogIn className="size-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
                  aria-pressed={tab === 'register'}
                  className={`py-2 text-xs font-sans font-bold   transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'register'
                      ? 'bg-primary text-recess shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <UserPlus className="size-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              {/* Feedback Alerts */}
              {error && (
                <div role="alert" className="mb-4 p-3 bg-red-950/50 border border-red-500/50 text-red-300 text-sm flex items-start gap-2.5">
                  <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div role="status" className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === 'login' ? (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor={`${formId}-identity`} className="text-xs font-sans font-bold   text-muted-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" />
                        <span>Username or Email</span>
                      </label>
                      <input
                        id={`${formId}-identity`}
                        ref={primaryInputRef}
                        type="text"
                        value={usernameOrEmail}
                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                        placeholder="e.g. Blake or hero@tamriel.com"
                        disabled={isSubmitting}
                        className="w-full bg-recess border border-border focus:border-primary focus:outline-none text-foreground text-sm px-3 py-2.5 transition-colors placeholder:text-muted-foreground"
                        autoComplete="username"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor={`${formId}-password`} className="text-xs font-sans font-bold   text-muted-foreground flex items-center gap-1.5">
                        <Lock className="size-3.5 text-primary" />
                        <span>Password</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`${formId}-password`}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={isSubmitting}
                          className="w-full bg-recess border border-border focus:border-primary focus:outline-none text-foreground text-sm px-3 py-2.5 pr-10 transition-colors placeholder:text-muted-foreground"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-1 transition-colors cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor={`${formId}-username`} className="text-xs font-sans font-bold   text-muted-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" />
                        <span>Username</span>
                      </label>
                      <input
                        id={`${formId}-username`}
                        ref={primaryInputRef}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="3–32 alphanumeric chars"
                        disabled={isSubmitting}
                        className="w-full bg-recess border border-border focus:border-primary focus:outline-none text-foreground text-sm px-3 py-2.5 transition-colors placeholder:text-muted-foreground"
                        autoComplete="username"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor={`${formId}-email`} className="text-xs font-sans font-bold   text-muted-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5 text-primary" />
                        <span>Email Address</span>
                      </label>
                      <input
                        id={`${formId}-email`}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        disabled={isSubmitting}
                        className="w-full bg-recess border border-border focus:border-primary focus:outline-none text-foreground text-sm px-3 py-2.5 transition-colors placeholder:text-muted-foreground"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor={`${formId}-handle`} className="text-xs font-sans font-bold   text-muted-foreground flex items-center gap-1.5">
                        <AtSign className="size-3.5 text-primary" />
                        <span>In-Game ESO Handle (Optional)</span>
                      </label>
                      <input
                        id={`${formId}-handle`}
                        type="text"
                        value={esoHandle}
                        onChange={(e) => setEsoHandle(e.target.value)}
                        placeholder="@AccountName"
                        disabled={isSubmitting}
                        className="w-full bg-recess border border-border focus:border-primary focus:outline-none text-foreground text-sm px-3 py-2.5 transition-colors placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor={`${formId}-password`} className="text-xs font-sans font-bold   text-muted-foreground flex items-center gap-1.5">
                          <Lock className="size-3.5 text-primary" />
                          <span>Password</span>
                        </label>
                        <div className="relative">
                          <input
                            id={`${formId}-password`}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 8 chars"
                            disabled={isSubmitting}
                            className="w-full bg-recess border border-border focus:border-primary focus:outline-none text-foreground text-sm px-3 py-2.5 pr-10 transition-colors placeholder:text-muted-foreground"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-1 transition-colors cursor-pointer"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor={`${formId}-confirm-password`} className="text-xs font-sans font-bold   text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-primary" />
                          <span>Confirm</span>
                        </label>
                        <div className="relative">
                          <input
                            id={`${formId}-confirm-password`}
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            disabled={isSubmitting}
                            className="w-full bg-recess border border-border focus:border-primary focus:outline-none text-foreground text-sm px-3 py-2.5 pr-10 transition-colors placeholder:text-muted-foreground"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-1 transition-colors cursor-pointer"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-none font-sans font-bold text-xs   bg-primary hover:bg-primary text-recess border border-primary py-3 mt-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/10 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>{tab === 'login' ? 'Sign in' : 'Create account'}</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Developer Sandbox Bypass Panel (DEV Mode only) */}
              {import.meta.env.DEV && (
                <div className="mt-8 pt-5 border-t border-border/70">
                  <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-primary   mb-2">
                    <Sparkles className="size-3.5" />
                    <span>Development sign-in</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Instant local development login bypassing password verification:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDevQuickLogin(1)}
                      disabled={isSubmitting}
                      className="text-left px-2.5 py-1.5 bg-recess border border-border hover:border-primary text-xs text-foreground transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-primary">@Blake (Admin)</div>
                      <div className="text-xs text-muted-foreground">Root Developer Account</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDevQuickLogin(2)}
                      disabled={isSubmitting}
                      className="text-left px-2.5 py-1.5 bg-recess border border-border hover:border-primary text-xs text-foreground transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-foreground">@TraderJoe</div>
                      <div className="text-xs text-muted-foreground">Standard User Account</div>
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
