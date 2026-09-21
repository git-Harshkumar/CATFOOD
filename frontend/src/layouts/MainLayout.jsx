import React from 'react';
import { Navbar } from '../components/Navbar';
import { ShieldCheck, Cpu, Database, Award } from 'lucide-react';

export const MainLayout = ({ children, currentView, setView }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar currentView={currentView} setView={setView} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-200">JuryFlow</span>
            <span>— Hackathon Judgment Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strict RBAC Enforced</span>
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Prisma + SQLite</span>
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>Weighted Scoring</span>
            </span>
          </div>

          <div>&copy; 2026 JuryFlow. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
