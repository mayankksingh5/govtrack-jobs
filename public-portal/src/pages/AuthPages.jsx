import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import SEO from '../components/SEO.jsx';

function AuthShell({ title, description, children }) {
  return (
    <div className="container max-w-lg py-16">
      <div className="panel px-6 py-8 sm:px-10">
        <h1 className="font-serif text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#667771]">{description}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setMessage('Signing in…');
    try {
      await login(form);
      navigate(location.state?.from || '/profile', { replace: true });
    } catch (error) { setMessage(error.message); }
  };
  return (
    <>
      <SEO title="Login" description="Sign in to manage your profile and saved government jobs." path="/login" />
      <AuthShell title="Welcome back" description="Sign in to access saved jobs, recent views, and personalized recommendations.">
        <form className="grid gap-4" onSubmit={submit}>
          <input className="input" type="email" required autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" required autoComplete="current-password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="button">Login</button>
          {message && <p className="text-sm text-[#667771]" role="status">{message}</p>}
        </form>
        <div className="mt-5 flex justify-between text-sm"><Link to="/register" className="text-[#a44723]">Create account</Link><Link to="/forgot-password" className="text-[#a44723]">Forgot password?</Link></div>
      </AuthShell>
    </>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setMessage('Creating account…');
    try {
      const response = await register(form);
      setMessage(response.data?.[0]?.email_verification_required ? 'Check your email to verify your account.' : 'Account created successfully.');
    } catch (error) { setMessage(error.message); }
  };
  return (
    <>
      <SEO title="Register" description="Create your Government Jobs Portal account." path="/register" />
      <AuthShell title="Create an account" description="Use at least 10 characters with upper-case, lower-case, and a number.">
        <form className="grid gap-4" onSubmit={submit}>
          <input className="input" required autoComplete="name" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" type="email" required autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" required minLength="10" autoComplete="new-password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="button">Register</button>
          {message && <p className="text-sm text-[#667771]" role="status">{message}</p>}
        </form>
        <p className="mt-5 text-sm">Already registered? <Link to="/login" className="text-[#a44723]">Login</Link></p>
      </AuthShell>
    </>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    try {
      const response = await forgotPassword(email);
      setMessage(response.data?.[0]?.message);
    } catch (error) { setMessage(error.message); }
  };
  return (
    <AuthShell title="Reset your password" description="We will send a recovery link if the account exists.">
      <form className="grid gap-4" onSubmit={submit}>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <button className="button">Send reset link</button>
        {message && <p className="text-sm text-[#667771]" role="status">{message}</p>}
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setToken(hash.get('access_token') || new URLSearchParams(window.location.search).get('access_token') || '');
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    try {
      await resetPassword(token, password);
      setMessage('Password updated. You can now log in.');
    } catch (error) { setMessage(error.message); }
  };
  return (
    <AuthShell title="Choose a new password" description="Recovery links are time limited and can be used only for the intended account.">
      <form className="grid gap-4" onSubmit={submit}>
        <input className="input" type="password" required minLength="10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
        <button className="button" disabled={!token}>Update password</button>
        {!token && <p className="text-sm text-red-700">Recovery token is missing.</p>}
        {message && <p className="text-sm text-[#667771]" role="status">{message}</p>}
      </form>
    </AuthShell>
  );
}
