import { FolderKanban, Home, Settings2, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { label: 'Home', path: '/dashboard', icon: Home, end: true },
  { label: 'Manage Clients', path: '/dashboard/clients', icon: UsersRound, end: false },
  { label: 'Projects', path: '/dashboard/projects', icon: FolderKanban, end: false },
  { label: 'Settings', path: '/dashboard/settings', icon: Settings2, end: false },
];

interface DashboardSidebarProps {
  trialDays: number | null;
}

export const DashboardSidebar = ({ trialDays }: DashboardSidebarProps) => (
  <aside className="dashboard-sidebar">
    <span className="sidebar-section-label">WORKSPACE</span>
    <nav className="dashboard-nav" aria-label="Studio dashboard">
      {menuItems.map(({ label, path, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) => `dashboard-nav-link${isActive ? ' is-active' : ''}`}
        >
          <Icon size={17} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>

    <div className="sidebar-bottom">
      <div className="sidebar-trial-card">
        <span className="sidebar-trial-indicator" />
        <div>
          <strong>Free trial</strong>
          <span>
            {trialDays === null
              ? 'Studio plan preview'
              : trialDays > 0
                ? `${trialDays} ${trialDays === 1 ? 'day' : 'days'} left`
                : 'Trial period ended'}
          </span>
        </div>
      </div>
      <div className="sidebar-product-mark">
        <span>♫</span> ClientSuite Music
      </div>
    </div>
  </aside>
);
