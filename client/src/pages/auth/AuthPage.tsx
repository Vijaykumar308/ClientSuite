import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { ArrowRight, ArrowUpRight, Check, Eye, EyeOff, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { GoogleComingSoonButton } from '../../components/auth/GoogleComingSoonButton';
import { useAuth, type AuthSession } from '../../auth/AuthContext';
import './auth.css';

type AuthMode = 'login' | 'signup';

interface AuthPageProps {
  mode: AuthMode;
}

interface AuthResponse {
  success: boolean;
  data: AuthSession;
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'We could not reach the server. Please try again.';
  }
  return 'Something went wrong. Please try again.';
};

export const AuthPage = ({ mode }: AuthPageProps) => {
  const isSignup = mode === 'signup';
  const { user, setSession } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = isSignup
        ? { firstName, lastName, studioName, email, password }
        : { email, password };
      const response = await apiClient.post<AuthResponse>(
        isSignup ? '/auth/register' : '/auth/login',
        payload
      );
      setSession(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    return (
      <AuthLayout
        heading="You’re all set."
        description={`Your ${user.workspace.name} workspace is ready to open.`}
      >
        <div className="auth-success" role="status">
          <span className="success-icon"><Check size={20} /></span>
          <div>
            <strong>{isSignup ? 'Your 14-day free trial has started.' : 'You’re signed in.'}</strong>
            <p>Your studio dashboard is private to your account.</p>
          </div>
        </div>
        <a className="auth-submit" href="/dashboard" target="_blank" rel="noopener noreferrer">
          Open studio dashboard <ArrowUpRight size={17} />
        </a>
        <p className="auth-switch">
          This page can stay open. Your dashboard will open in a new tab.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading={isSignup ? 'Create your studio account' : 'Welcome back'}
      description={
        isSignup
          ? 'Start your 14-day free trial. No payment details needed.'
          : 'Sign in to pick up where your studio left off.'
      }
    >
      <GoogleComingSoonButton />
      <div className="auth-divider"><span>or use your email</span></div>

      <form className="auth-form" onSubmit={submit}>
        {isSignup && (
          <>
            <div className="auth-name-row">
              <label className="auth-field">
                <span>First name</span>
                <input
                  autoComplete="given-name"
                  maxLength={80}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Jordan"
                  required
                  value={firstName}
                />
              </label>
              <label className="auth-field">
                <span>Last name <i>Optional</i></span>
                <input
                  autoComplete="family-name"
                  maxLength={80}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Lee"
                  value={lastName}
                />
              </label>
            </div>
            <label className="auth-field">
              <span>Studio or business name</span>
              <input
                autoComplete="organization"
                maxLength={120}
                minLength={2}
                onChange={(event) => setStudioName(event.target.value)}
                placeholder="Northstar Studio"
                required
                value={studioName}
              />
            </label>
          </>
        )}

        <label className="auth-field">
          <span>Email address</span>
          <input
            autoComplete="email"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@yourstudio.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="auth-field">
          <span>Password {isSignup && <i>At least 12 characters</i>}</span>
          <span className="password-input-wrap">
            <input
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              maxLength={128}
              minLength={isSignup ? 12 : 1}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isSignup ? 'Create a strong password' : 'Enter your password'}
              required
              type={passwordVisible ? 'text' : 'password'}
              value={password}
            />
            <button
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              className="password-toggle"
              onClick={() => setPasswordVisible((visible) => !visible)}
              type="button"
            >
              {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        {isSignup && (
          <p className="trial-notice">
            <span><Check size={13} /></span>
            14 days free · No credit card required
          </p>
        )}

        <button className="auth-submit" disabled={submitting} type="submit">
          {submitting ? 'Please wait…' : isSignup ? 'Create my studio account' : 'Sign in'}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="auth-switch">
        {isSignup ? 'Already have an account?' : 'New to ClientSuite?'}{' '}
        <Link to={isSignup ? '/login' : '/signup'}>
          {isSignup ? 'Sign in' : 'Start your free trial'}
        </Link>
      </p>
      <div className="auth-secure-note"><Music2 size={13} /> Your studio data stays private</div>
    </AuthLayout>
  );
};
