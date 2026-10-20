import { useState } from 'react';
import { ArrowUpRight, Menu, Music2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const navigation = [
  { label: 'Platform', href: '#features' },
  { label: 'How it works', href: '#workflow' },
];

export const SiteHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="ClientSuite Music home">
        <span className="brand-mark">
          <Music2 size={19} strokeWidth={2.2} />
        </span>
        <span className="brand-name">
          ClientSuite<span>Music</span>
        </span>
      </Link>

      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      <nav className={`site-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
        {navigation.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
            {item.label}
          </a>
        ))}
        <Link
          className="header-login-link"
          to="/login"
          onClick={() => setMenuOpen(false)}
        >
          Sign in
        </Link>
        <Link
          className="button button-small button-outline"
          to="/signup"
          onClick={() => setMenuOpen(false)}
        >
          Start free trial <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
};
