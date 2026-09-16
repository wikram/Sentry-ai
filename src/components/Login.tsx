/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, User, Lock, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: { email: string; username?: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        // Response was not JSON
      }

      if (response.ok && data && data.status === 'success') {
        onLogin({ email, username: email });
      } else {
        // Extract any potential error message from the response data
        let errorDetail = '';
        if (data) {
          if (typeof data === 'string') {
            errorDetail = data;
          } else {
            errorDetail = data.message || data.detail || data.error || data.error_description || '';
          }
        }

        // Clean up or humanize common backend error patterns
        if (errorDetail) {
          if (
            errorDetail.toLowerCase().includes('invalid credentials') || 
            errorDetail.toLowerCase().includes('failed to log in') ||
            errorDetail.toLowerCase().includes('unauthorized') ||
            errorDetail.toLowerCase().includes('failed to authorize')
          ) {
            errorDetail = 'Invalid username or password. Please verify your credentials.';
          }
        } else {
          // Fallback messages based on HTTP status codes to be highly user-friendly
          if (response.status === 401 || response.status === 403) {
            errorDetail = 'Invalid username or password. Please verify your credentials.';
          } else if (response.status === 404) {
            errorDetail = 'Login service not found. Please contact your system administrator.';
          } else if (response.status >= 500) {
            errorDetail = 'Internal server error. Please try again later.';
          } else {
            // Status 200 or other unexpected codes with no body details
            errorDetail = 'Authentication failed. Please check your username and password.';
          }
        }

        setErrorMsg(errorDetail);
      }
    } catch (err) {
      console.error('Login request failed:', err);
      setErrorMsg('Network error. Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex relative overflow-hidden">
      {/* Left side: branding/telemetry graphics (visible on md and up) */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 relative z-10 border-r border-slate-900 bg-[#030712]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
            <ShieldAlert size={20} className="text-blue-500" />
          </div>
          <div>
            <span className="text-sm font-black tracking-widest text-white">DEVOPS STUDIO</span>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Autonomous Operations</p>
          </div>
        </div>

        <div className="max-w-md my-auto space-y-6">
          <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
            Autonomous synthesis of distributed system health.
          </h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Monitor, trace, and diagnose infrastructure anomalies in real-time. Coordinate diagnostic agents to automate logs correlation and discover root causes instantly.
          </p>
          
          <div className="border border-slate-800/60 rounded-2xl p-5 bg-slate-950/40 font-mono text-[11px] text-slate-400 space-y-2">
            <div className="flex justify-between text-[10px] text-slate-500 border-b border-slate-900 pb-2 mb-2 font-bold uppercase tracking-wider">
              <span>Diagnostic Sync</span>
              <span className="text-green-500 animate-pulse">● Connected</span>
            </div>
            <div className="flex gap-4">
              <span className="text-slate-600">04:50:54</span>
              <span className="text-blue-400">[Agent-Core]</span>
              <span>Loaded 4 diagnostic profiles...</span>
            </div>
            <div className="flex gap-4">
              <span className="text-slate-600">04:50:55</span>
              <span className="text-blue-400">[Telemetry]</span>
              <span>Ready for stream ingestion.</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          Control Center v 0.0.1
        </div>
      </div>

      {/* Right side: Login container */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10 bg-[#020617]/50">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-cyan-600/5 rounded-full blur-[120px] animate-pulse delay-700" />
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-10 relative z-10 shadow-2xl border border-slate-200"
        >
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/10">
              <ShieldAlert size={32} className="text-blue-500" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">Devops Studio</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Autonomous Operations & Governance</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Terminal ID / Username</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                placeholder="operator@devops.central or username"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="password" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {errorMsg}
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-[0.25em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Logging in...' : 'Login'} <LogIn size={16} />
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> SECURE LINK ESTABLISHED
          </p>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
