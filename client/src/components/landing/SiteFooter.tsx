import { Music2 } from 'lucide-react';

export const SiteFooter = () => (
  <footer className="site-footer">
    <a className="brand footer-brand" href="#top">
      <span className="brand-mark"><Music2 size={17} /></span>
      <span className="brand-name">ClientSuite<span>Music</span></span>
    </a>
    <p>Your music business, simplified.</p>
    <span className="footer-copyright">© {new Date().getFullYear()} ClientSuite Music</span>
  </footer>
);
