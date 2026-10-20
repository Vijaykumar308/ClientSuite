import { ArrowLeft, AudioLines, LockKeyhole, Music2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  heading: string;
  description: string;
}

export const AuthLayout = ({ children, heading, description }: AuthLayoutProps) => (
  <main className="auth-page">
    <section className="auth-story">
      <Link className="auth-brand" to="/" aria-label="ClientSuite Music home">
        <span className="auth-brand-mark"><Music2 size={19} /></span>
        <span>ClientSuite <i>Music</i></span>
      </Link>
      <Link className="auth-back-link" to="/">
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="story-copy">
        <span className="story-eyebrow"><Sparkles size={13} /> YOUR STUDIO, IN HARMONY</span>
        <h1>More music.<br /><em>Less managing.</em></h1>
        <p>
          Bring your clients, projects, previews, and delivery together in a
          calmer place to work.
        </p>
      </div>

      <div className="story-highlights">
        <div><AudioLines size={16} /><span>Private previews, made simple</span></div>
        <div><LockKeyhole size={16} /><span>Your studio workspace stays yours</span></div>
      </div>
      <span className="story-footer">A little more space for the work you love.</span>
    </section>

    <section className="auth-panel">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand">
          <span className="auth-brand-mark"><Music2 size={18} /></span>
          <span>ClientSuite <i>Music</i></span>
        </div>
        <span className="auth-form-eyebrow">WELCOME TO CLIENTSUITE</span>
        <h2>{heading}</h2>
        <p className="auth-description">{description}</p>
        {children}
      </div>
      <p className="auth-legal">By continuing, you agree to use ClientSuite responsibly and keep your account secure.</p>
    </section>
  </main>
);
