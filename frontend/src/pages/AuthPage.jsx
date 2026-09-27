import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Trophy, Lock, Mail, User, Shield, Sparkles } from 'lucide-react';

export const AuthPage = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('PARTICIPANT');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        await register({ email, password, name, role });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.errors?.password || (err.errors ? Object.values(err.errors).join(', ') : err.message);
      setError(msg || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail) => {
    setError(null);
    setLoading(true);
    try {
      await login({ email: demoEmail, password: 'password123' });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-12 pr-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";
  const labelClass = "block font-black text-neo-ink mb-2";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-neo-bg">
      <div className="w-full max-w-md">
        
        {/* Quick Demo Switcher Card */}
        <div className="mb-8 p-4 rounded-2xl bg-white border-3 border-neo-ink neo-shadow">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-neo-ink" />
            <h4 className="text-sm font-black uppercase tracking-wider text-neo-ink">
              One-Click Role Demo
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => quickLogin('organizer@hack.com')}
              className="px-2 py-2 rounded-xl bg-neo-pastel-purple border-3 border-neo-ink text-neo-ink text-xs font-black uppercase hover:-translate-y-1 transition-transform"
            >
              Organizer
            </button>
            <button
              type="button"
              onClick={() => quickLogin('judge1@hack.com')}
              className="px-2 py-2 rounded-xl bg-neo-pastel-green border-3 border-neo-ink text-neo-ink text-xs font-black uppercase hover:-translate-y-1 transition-transform"
            >
              Judge
            </button>
            <button
              type="button"
              onClick={() => quickLogin('alice@hack.com')}
              className="px-2 py-2 rounded-xl bg-neo-pastel-blue border-3 border-neo-ink text-neo-ink text-xs font-black uppercase hover:-translate-y-1 transition-transform"
            >
              Participant
            </button>
          </div>
        </div>

        {/* Auth Form Card */}
        <NeoCard color="bg-neo-pastel-yellow" className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-white border-4 border-neo-ink flex items-center justify-center neo-shadow mb-4">
              <Trophy className="w-8 h-8 text-neo-ink" />
            </div>
            <h2 className="text-4xl font-black text-neo-ink tracking-tight mb-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-sm font-bold text-neo-ink/70">
              {isLogin
                ? 'Welcome back to Dogfood Hack'
                : 'Join the premier hackathon platform'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-neo-pastel-pink border-3 border-neo-ink font-bold text-neo-ink text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <label className={labelClass}>Full Name</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Alan Turing"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Platform Role</label>
                  <div className="relative">
                    <Shield className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className={inputClass}
                    >
                      <option value="PARTICIPANT">Participant (Hacker)</option>
                      <option value="JUDGE">Judge (Reviewer)</option>
                      <option value="ORGANIZER">Organizer (Host)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="developer@hack.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={!isLogin ? 6 : undefined}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              {!isLogin && (
                <p className={`text-xs font-bold mt-2 transition-colors ${
                  password.length > 0 && password.length < 6
                    ? 'text-red-600'
                    : 'text-neo-ink/70'
                }`}>
                  Password must be at least 6 characters long{password.length > 0 && password.length < 6 ? ` (${password.length}/6 characters entered)` : ''}.
                </p>
              )}
            </div>

            <NeoButton
              type="submit"
              disabled={loading}
              color="bg-neo-ink"
              textColor="text-white"
              className="w-full mt-8 !py-4 text-lg"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In to JuryFlow' : 'Create Account'}
            </NeoButton>
          </form>

          <div className="mt-8 text-center text-sm font-bold text-neo-ink/70">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="font-black text-neo-ink hover:underline decoration-3 underline-offset-4"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};
