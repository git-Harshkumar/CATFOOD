import React from 'react';
import { Navbar } from '../components/Navbar';
import { ShieldCheck, Database, Award } from 'lucide-react';

export const MainLayout = ({ children, currentView, setView }) => {
  return (
    <div className="min-h-screen flex flex-col selection:bg-neo-pastel-pink selection:text-neo-ink">
      <Navbar currentView={currentView} setView={setView} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-neo-ink bg-white py-8 mt-12 neo-shadow-[inset_0px_4px_0px_0px_#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-bold text-neo-ink/70 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-black text-neo-ink">Dogfood Hack</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-neo-ink" />
              <span>Strict RBAC</span>
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-4 h-4 text-neo-ink" />
              <span>Prisma + SQLite</span>
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-4 h-4 text-neo-ink" />
              <span>Weighted Rubrics</span>
            </span>
          </div>

          <div>&copy; 2026 Dogfood. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
