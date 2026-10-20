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
  Sparkles
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
          }}>
            <Music size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ClientSuite <span style={{ color: '#818cf8', WebkitTextFillColor: '#818cf8' }}>Music</span>
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Your Music Business, Simplified • Multi-Tenant SaaS</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="badge badge-purple" style={{ padding: '6px 14px' }}>
            <Sparkles size={13} /> Phase 0: Scaffolding Complete
          </div>
          <button className="btn-primary" onClick={() => alert('Phase 1 (Prisma + PostgreSQL Schema) is next!')}>
            Get Started <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* API Health & Architecture Status Banner */}
      <section className="glass-panel" style={{ padding: '24px 28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: loading ? 'rgba(245, 158, 11, 0.15)' : error ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              padding: '12px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Server size={22} color={loading ? '#fbbf24' : error ? '#f43f5e' : '#34d399'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Express + TypeScript API Connectivity</h3>
                {loading && <span className="badge badge-warning">Checking...</span>}
                {!loading && !error && <span className="badge badge-success"><CheckCircle2 size={12} /> Connected</span>}
                {error && <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>Offline (Start Server)</span>}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {loading 
                  ? 'Verifying handshake with backend at http://localhost:5000/api/health...'
                  : error 
                    ? `Backend connection status: ${error}. Run 'npm run dev:server' to activate live API.`
                    : `API active: ${health?.service} v${health?.version} • Uptime: ${Math.round(health?.uptime || 0)}s`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', padding: '6px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              Node v22 • React 18 • TypeScript 5
            </span>
          </div>
        </div>
      </section>

      {/* Architecture Highlights Grid */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '18px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={18} color="#818cf8" /> Platform Architecture Modules
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <ShieldCheck size={22} color="#818cf8" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>Multi-Tenant Isolation</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Strict data boundaries per music studio tenant with automated <code>tenantId</code> scope injection and role-based guards.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <PlayCircle size={22} color="#c084fc" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>Server-Side Audio Trimming</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Original masters remain in private storage. Server creates separate 10–15s preview clips, preventing audio leaks.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <CreditCard size={22} color="#34d399" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>Direct Settlement Payments</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Each music director connects their own gateway. Webhook-verified payment auto-unlocks final master track downloads.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Activity size={22} color="#fbbf24" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>EC2 Production Ready</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Standardized PM2 cluster and Nginx reverse-proxy setup for painless migration from localhost to AWS EC2.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        <span>ClientSuite Music Monorepo Foundation</span>
        <span>Repository: <strong style={{ color: 'var(--text-muted)' }}>Vijaykumar308/ClientSuite</strong></span>
      </footer>
    </div>
  );
};
