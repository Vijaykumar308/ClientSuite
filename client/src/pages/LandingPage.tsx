import { FeatureSection } from '../components/landing/FeatureSection';
import { HeroSection } from '../components/landing/HeroSection';
import { SiteFooter } from '../components/landing/SiteFooter';
import { SiteHeader } from '../components/landing/SiteHeader';
import { WorkflowSection } from '../components/landing/WorkflowSection';
import { Link } from 'react-router-dom';
import './landing.css';

export const LandingPage = () => (
  <div className="landing-page">
    <SiteHeader />
    <main>
      <HeroSection />
      <FeatureSection />
      <WorkflowSection />
      <section className="closing-section" id="contact">
        <div className="closing-glow" aria-hidden="true" />
        <div className="closing-content">
          <span className="eyebrow">MADE FOR THE BUSINESS OF MUSIC</span>
          <h2>Your next great client experience starts here.</h2>
          <p>
            Spend less time chasing files and updates. Give every project a
            home that feels as considered as the music you make.
          </p>
          <Link className="button button-primary" to="/signup">
            Start your free trial <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="closing-note">
          <span className="note-icon">♪</span>
          <span>One calm workspace. Every project in tune.</span>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
);
