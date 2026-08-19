import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/ui/navbar';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
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
  AtSign
} from 'lucide-react';

export default function Login() {
  const { user, login, register, devBypass } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab state: 'login' or 'register'
  const [tab, setTab] = useState('login');

  // Form input states
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [esoHandle, setEsoHandle] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setSuccessMsg('Welcome back to Tamriel!');
          setTimeout(() => navigate('/marketplace'), 400);
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
        setTimeout(() => navigate('/marketplace'), 400);
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
    <div className="min-h-screen bg-[#0a0a0d] text-[#e0d8c3] flex flex-col selection:bg-[#c5a059]/30 selection:text-[#d4af37]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Ambient atmospheric backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#c5a059]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-950/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          <Card className="border border-[#2a2c33] bg-[#121218]/95 backdrop-blur-md shadow-2xl rounded-none relative overflow-hidden">
            {/* Top gold embellishment line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent" />

            <CardHeader className="text-center pb-4 pt-6">
              <div className="inline-flex p-3 bg-[#0a0a0d] border border-[#c5a059]/30 mb-3 mx-auto text-[#c5a059] shadow-inner">
                {tab === 'login' ? <LogIn className="size-6" /> : <UserPlus className="size-6" />}
              </div>

              <CardTitle className="font-cinzel text-2xl sm:text-3xl font-extrabold text-[#d4af37] tracking-wider uppercase">
                {tab === 'login' ? 'Merchant Portal' : 'Register Merchant'}
              </CardTitle>
              <CardDescription className="text-[#a89f91] text-xs sm:text-sm mt-1">
                {tab === 'login'
                  ? 'Sign in to access your synchronized character gear and live market watchlists.'
                  : 'Create your Tamriel Toolkit trading account to track prices and sync in-game scans.'}
              </CardDescription>

              {/* Tab Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-[#0a0a0d] border border-[#2a2c33] p-1 mt-5">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
                  className={`py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'login'
                      ? 'bg-[#c5a059] text-[#0a0a0d] shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <LogIn className="size-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
                  className={`py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'register'
                      ? 'bg-[#c5a059] text-[#0a0a0d] shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
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
                <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === 'login' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#a89f91] flex items-center gap-1.5">
                        <User className="size-3.5 text-[#c5a059]" />
                        <span>Username or Email</span>
                      </label>
                      <input
                        type="text"
                        value={usernameOrEmail}
                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                        placeholder="e.g. Blake or hero@tamriel.com"
                        disabled={isSubmitting}
                        className="w-full bg-[#0a0a0d] border border-[#2a2c33] focus:border-[#c5a059] focus:outline-none text-[#e0d8c3] text-sm px-3 py-2.5 transition-colors placeholder:text-[#555047]"
                        autoComplete="username"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#a89f91] flex items-center gap-1.5">
                        <Lock className="size-3.5 text-[#c5a059]" />
                        <span>Password</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                        className="w-full bg-[#0a0a0d] border border-[#2a2c33] focus:border-[#c5a059] focus:outline-none text-[#e0d8c3] text-sm px-3 py-2.5 transition-colors placeholder:text-[#555047]"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#a89f91] flex items-center gap-1.5">
                        <User className="size-3.5 text-[#c5a059]" />
                        <span>Username</span>
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="3–32 alphanumeric chars"
                        disabled={isSubmitting}
                        className="w-full bg-[#0a0a0d] border border-[#2a2c33] focus:border-[#c5a059] focus:outline-none text-[#e0d8c3] text-sm px-3 py-2.5 transition-colors placeholder:text-[#555047]"
                        autoComplete="username"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#a89f91] flex items-center gap-1.5">
                        <Mail className="size-3.5 text-[#c5a059]" />
                        <span>Email Address</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        disabled={isSubmitting}
                        className="w-full bg-[#0a0a0d] border border-[#2a2c33] focus:border-[#c5a059] focus:outline-none text-[#e0d8c3] text-sm px-3 py-2.5 transition-colors placeholder:text-[#555047]"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#a89f91] flex items-center gap-1.5">
                        <AtSign className="size-3.5 text-[#c5a059]" />
                        <span>In-Game ESO Handle (Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={esoHandle}
                        onChange={(e) => setEsoHandle(e.target.value)}
                        placeholder="@AccountName"
                        disabled={isSubmitting}
                        className="w-full bg-[#0a0a0d] border border-[#2a2c33] focus:border-[#c5a059] focus:outline-none text-[#e0d8c3] text-sm px-3 py-2.5 transition-colors placeholder:text-[#555047]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#a89f91] flex items-center gap-1.5">
                          <Lock className="size-3.5 text-[#c5a059]" />
                          <span>Password</span>
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 8 chars"
                          disabled={isSubmitting}
                          className="w-full bg-[#0a0a0d] border border-[#2a2c33] focus:border-[#c5a059] focus:outline-none text-[#e0d8c3] text-sm px-3 py-2.5 transition-colors placeholder:text-[#555047]"
                          autoComplete="new-password"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-cinzel font-bold uppercase tracking-wider text-[#a89f91] flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-[#c5a059]" />
                          <span>Confirm</span>
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          disabled={isSubmitting}
                          className="w-full bg-[#0a0a0d] border border-[#2a2c33] focus:border-[#c5a059] focus:outline-none text-[#e0d8c3] text-sm px-3 py-2.5 transition-colors placeholder:text-[#555047]"
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-none font-cinzel font-bold text-xs uppercase tracking-wider bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] border border-[#c5a059] py-3 mt-4 flex items-center justify-center gap-2 shadow-lg shadow-[#c5a059]/10 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>{tab === 'login' ? 'Enter Marketplace' : 'Register Account'}</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Developer Sandbox Bypass Panel (DEV Mode only) */}
              {import.meta.env.DEV && (
                <div className="mt-8 pt-5 border-t border-[#2a2c33]/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-cinzel font-bold text-[#c5a059] uppercase tracking-wider mb-2">
                    <Sparkles className="size-3.5" />
                    <span>Developer Sandbox 1-Click Login</span>
                  </div>
                  <p className="text-[11px] text-[#8a8275] mb-3">
                    Instant local development login bypassing password verification:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDevQuickLogin(1)}
                      disabled={isSubmitting}
                      className="text-left px-2.5 py-1.5 bg-[#0a0a0d] border border-[#2a2c33] hover:border-[#c5a059] text-[11px] text-[#e0d8c3] transition-colors"
                    >
                      <div className="font-bold text-[#d4af37]">@Blake (Admin)</div>
                      <div className="text-[10px] text-[#8a8275]">Root Developer Account</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDevQuickLogin(2)}
                      disabled={isSubmitting}
                      className="text-left px-2.5 py-1.5 bg-[#0a0a0d] border border-[#2a2c33] hover:border-[#c5a059] text-[11px] text-[#e0d8c3] transition-colors"
                    >
                      <div className="font-bold text-[#e0d8c3]">@TraderJoe</div>
                      <div className="text-[10px] text-[#8a8275]">Standard User Account</div>
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