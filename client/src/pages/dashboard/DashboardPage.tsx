import { useState } from 'react';
import { Headphones, LogOut, Music2, Plus, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import { ClientsPage } from './clients/ClientsPage';
import { ClientFormPage } from './clients/ClientFormPage';
import { ProjectDetailsPage } from './projects/ProjectDetailsPage';
import { ProjectFormPage } from './projects/ProjectFormPage';
import { ProjectsPage } from './projects/ProjectsPage';
import './dashboard.css';

const getTrialDaysRemaining = (trialEndsAt: string | null): number | null => {
  if (!trialEndsAt) return null;
  const remaining = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
};

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (!user) return null;

  const trialDays = getTrialDaysRemaining(user.workspace.trialEndsAt);
  const initials = `${user.user.firstName[0] ?? ''}${user.user.lastName?.[0] ?? ''}`.toUpperCase();
  const activeSection = location.pathname.startsWith('/dashboard/clients')
    ? 'clients'
    : location.pathname.startsWith('/dashboard/projects')
      ? 'projects'
    : location.pathname.startsWith('/dashboard/settings')
      ? 'settings'
      : 'home';
  const clientEditId = location.pathname.match(/^\/dashboard\/clients\/([^/]+)\/edit$/)?.[1];
  const isClientCreate = location.pathname === '/dashboard/clients/new';
  const isProjectCreate = location.pathname === '/dashboard/projects/new';
  const projectId = location.pathname.match(/^\/dashboard\/projects\/([^/]+)$/)?.[1];

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('We could not sign you out. Please try again.');
    }
  };

  return (
    <div className="studio-dashboard">
      <header className="studio-header">
        <Link className="studio-brand" to="/">
          <span><Music2 size={18} /></span>
          ClientSuite <i>Music</i>
        </Link>
        <div className="studio-header-actions">
          <span className="studio-workspace-name">{user.workspace.name}</span>
          <span className="studio-user-avatar" aria-label={`Signed in as ${user.user.firstName}`}>
            {initials || 'S'}
          </span>
          <button className="studio-logout" onClick={() => void handleLogout()} type="button">
            <LogOut size={15} /><span>Sign out</span>
          </button>
        </div>
      </header>

      <div className="studio-app-shell">
        <DashboardSidebar trialDays={trialDays} />
        <main className="studio-main">
          {activeSection === 'home' && (
            <section className="studio-content">
              <div className="studio-welcome">
                <span className="studio-eyebrow"><Sparkles size={13} /> YOUR PRIVATE STUDIO WORKSPACE</span>
                <h1>Good to have you here, {user.user.firstName}.</h1>
                <p>This is the home for your clients, music projects, previews, and deliveries.</p>
              </div>

              <div className="trial-banner">
                <span className="trial-banner-icon"><Sparkles size={17} /></span>
                <div className="trial-banner-copy">
                  <strong>Your 14-day free trial is active</strong>
                  <span>
                    {trialDays === null
                      ? 'Explore your new studio workspace.'
                      : trialDays > 0
                        ? `${trialDays} ${trialDays === 1 ? 'day' : 'days'} remaining · No payment details needed`
                        : 'Your trial period has ended. Trial access policy will be available soon.'}
                  </span>
                </div>
                <span className="trial-label">FREE TRIAL</span>
              </div>

              <div className="dashboard-empty-state">
                <div className="empty-art" aria-hidden="true">
                  <span className="empty-art-disc"><Headphones size={33} strokeWidth={1.4} /></span>
                  <span className="empty-art-spark spark-one">✳</span>
                  <span className="empty-art-spark spark-two">✦</span>
                  <span className="empty-art-note">♪</span>
                </div>
                <span className="studio-eyebrow">A FRESH START FOR {user.workspace.name.toUpperCase()}</span>
                <h2>Your studio is ready for its first project.</h2>
                <p>
                  Your private workspace is ready. Start by adding your clients
                  and the projects you are working on together.
                </p>
                <button className="workspace-next-step" type="button" onClick={() => navigate('/dashboard/clients')}>
                  <Plus size={16} /> Manage clients
                </button>
              </div>

              <div className="workspace-footnote">
                <span>Your workspace is private to your account.</span>
              </div>
            </section>
          )}

          {activeSection === 'clients' && (
            isClientCreate || clientEditId
              ? <ClientFormPage clientId={clientEditId} />
              : <ClientsPage />
          )}

          {activeSection === 'projects' && (
            isProjectCreate
              ? <ProjectFormPage />
              : projectId
                ? <ProjectDetailsPage projectId={projectId} />
                : <ProjectsPage />
          )}

          {activeSection === 'settings' && (
            <section className="studio-content">
              <div className="studio-welcome">
                <span className="studio-eyebrow">YOUR STUDIO, YOUR DETAILS</span>
                <h1>Settings</h1>
                <p>Review the account and workspace details associated with your studio.</p>
              </div>
              <div className="settings-card">
                <div className="settings-card-heading">
                  <div>
                    <span className="settings-kicker">WORKSPACE</span>
                    <h2>Studio information</h2>
                  </div>
                  <span className="settings-readonly">Account details</span>
                </div>
                <dl className="settings-list">
                  <div><dt>Studio name</dt><dd>{user.workspace.name}</dd></div>
                  <div><dt>Account owner</dt><dd>{user.user.firstName} {user.user.lastName ?? ''}</dd></div>
                  <div><dt>Email address</dt><dd>{user.user.email}</dd></div>
                  <div><dt>Workspace status</dt><dd><span className="settings-status">{user.workspace.status}</span></dd></div>
                </dl>
                <p className="settings-note">Workspace editing and profile settings will be available in a future update.</p>
              </div>
            </section>
          )}
          {logoutError && <p className="dashboard-error" role="alert">{logoutError}</p>}
        </main>
      </div>
    </div>
  );
};
