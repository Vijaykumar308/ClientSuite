import React, { useEffect, useState } from 'react';
import { 
  Music, 
  Layers, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  PlayCircle, 
  CreditCard, 
  ChevronRight,
  Server,
  Palette
} from 'lucide-react';
import { apiClient } from './api/client';

interface HealthData {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await apiClient.get('/health');
        if (response.data?.success) {
          setHealth(response.data.data);
        }
      } catch (err: any) {
        setError(err.message || 'Could not connect to API server');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl shadow-glow">
              <Music className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ClientSuite <span className="text-indigo-400">Music</span>
              </h1>
              <p className="text-xs text-slate-400 tracking-wide uppercase font-medium mt-0.5">
                Your Music Business, Simplified • Multi-Tenant SaaS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Palette className="w-3.5 h-3.5 text-indigo-400" /> Tailwind CSS v3 Configured
            </div>
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition shadow-glow"
              onClick={() => alert('Tailwind is active! Proceeding to Phase 1 (Prisma + PostgreSQL Schema)')}
            >
              Get Started <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* API Health & Architecture Status Banner */}
        <section className="p-6 mb-10 rounded-2xl bg-[#12141a]/80 backdrop-blur-md border border-white/10 shadow-xl transition-all hover:border-indigo-500/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${loading ? 'bg-amber-500/10 text-amber-400' : error ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-white">Express + TypeScript API Connectivity</h3>
                  {loading && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Checking...
                    </span>
                  )}
                  {!loading && !error && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                  {error && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Offline (Dev Ready)
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {loading 
                    ? 'Verifying handshake with backend at http://localhost:5000/api/health...'
                    : error 
                      ? `Status: ${error}. Start server via 'npm run dev' to activate live endpoints.`
                      : `Live API: ${health?.service} v${health?.version} • Uptime: ${Math.round(health?.uptime || 0)}s`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
              <span>Node 22</span>
              <span>•</span>
              <span>React 18</span>
              <span>•</span>
              <span className="text-cyan-400">Tailwind 3.4</span>
            </div>
          </div>
        </section>

        {/* Modular Architecture Grid */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" /> Platform Architecture Modules
          </h2>
          <span className="text-xs text-slate-400 font-medium">Domain-driven modular layout</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <div className="p-6 rounded-2xl bg-[#12141a]/60 hover:bg-[#161922] border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Multi-Tenant Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict data separation per music studio tenant with automated <code>tenantId</code> scope injection and role-based guards.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#12141a]/60 hover:bg-[#161922] border border-white/5 hover:border-purple-500/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 text-purple-400">
              <PlayCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Server Audio Trimming</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Original audio masters stay in private storage. Server creates separate 10–15s preview clips, preventing full track theft.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#12141a]/60 hover:bg-[#161922] border border-white/5 hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Direct Settlement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each music director connects their own gateway. Webhook-verified payment auto-unlocks final master track downloads.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#12141a]/60 hover:bg-[#161922] border border-white/5 hover:border-amber-500/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">EC2 Production Ready</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardized PM2 cluster and Nginx reverse-proxy setup for painless migration from localhost to AWS EC2.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <span>ClientSuite Music Monorepo Foundation</span>
          <span>Repository: <strong className="text-slate-300">Vijaykumar308/ClientSuite</strong></span>
        </footer>
      </div>
    </div>
  );
};
