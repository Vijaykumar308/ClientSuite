export const GoogleComingSoonButton = () => (
  <div className="google-option">
    <button className="google-button" type="button" disabled aria-disabled="true">
      <span className="google-mark" aria-hidden="true">G</span>
      Continue with Google
      <span className="coming-soon-badge">Coming soon</span>
    </button>
    <p>Google sign-in will be available in a future update.</p>
  </div>
);
