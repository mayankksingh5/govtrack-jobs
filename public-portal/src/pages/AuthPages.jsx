import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import SEO from '../components/SEO.jsx';

function AuthShell({ eyebrow, title, description, children }) {
  return (
    <main className="container form-page">
      <div className="form-card">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </main>
  );
}

function Field({ label, ...input }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...input} />
    </label>
  );
}

function Message({ text, error = false }) {
  return text ? <p className={`form-message ${error ? 'error' : ''}`} role="status">{text}</p> : null;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '' });
  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: 'Signing in…' });
    try {
      await login(form);
      navigate(location.state?.from || '/profile', { replace: true });
    } catch (error) { setMessage({ text: error.message, error: true }); }
  };
  return (
    <>
      <SEO title="Login" description="Sign in to manage your profile and saved government jobs." path="/login" />
      <AuthShell eyebrow="WELCOME BACK" title="Login to GovTrack" description="Sign in to access saved jobs, recent views, and personalized recommendations.">
        <form className="form-grid" onSubmit={submit}>
          <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label="Password" type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="button primary">Login</button>
          <Message {...message} />
        </form>
        <div className="form-links">
          <Link to="/register">Create account</Link>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </AuthShell>
    </>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState({ text: '' });
  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: 'Creating account…' });
    try {
      const response = await register(form);
      setMessage({ text: response.data?.[0]?.email_verification_required ? 'Check your email to verify your account.' : 'Account created successfully.' });
    } catch (error) { setMessage({ text: error.message, error: true }); }
  };
  return (
    <>
      <SEO title="Register" description="Create your GovTrack Jobs account." path="/register" />
      <AuthShell eyebrow="JOIN GOVTRACK" title="Create an account" description="Use at least 10 characters with upper-case, lower-case, and a number.">
        <form className="form-grid" onSubmit={submit}>
          <Field label="Full name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label="Password" type="password" required minLength="10" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="button primary">Register</button>
          <Message {...message} />
        </form>
        <div className="form-links">
          <span>Already registered? <Link to="/login">Login</Link></span>
        </div>
      </AuthShell>
    </>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ text: '' });
  const submit = async (event) => {
    event.preventDefault();
    try {
      const response = await forgotPassword(email);
      setMessage({ text: response.data?.[0]?.message });
    } catch (error) { setMessage({ text: error.message, error: true }); }
  };
  return (
    <AuthShell eyebrow="ACCOUNT RECOVERY" title="Reset your password" description="We will send a recovery link if the account exists.">
      <form className="form-grid" onSubmit={submit}>
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="button primary">Send reset link</button>
        <Message {...message} />
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '' });
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setToken(hash.get('access_token') || new URLSearchParams(window.location.search).get('access_token') || '');
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    try {
      await resetPassword(token, password);
      setMessage({ text: 'Password updated. You can now log in.' });
    } catch (error) { setMessage({ text: error.message, error: true }); }
  };
  return (
    <AuthShell eyebrow="ACCOUNT RECOVERY" title="Choose a new password" description="Recovery links are time limited and can be used only for the intended account.">
      <form className="form-grid" onSubmit={submit}>
        <Field label="New password" type="password" required minLength="10" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="button primary" disabled={!token}>Update password</button>
        {!token && <Message text="Recovery token is missing." error />}
        <Message {...message} />
      </form>
    </AuthShell>
  );
}
