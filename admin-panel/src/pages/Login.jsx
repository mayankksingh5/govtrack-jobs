import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(location.state?.error || '');
  if (user?.role === 'admin') return <Navigate to="/dashboard" replace />;
  const submit = async (event) => {
    event.preventDefault();
    setMessage('Signing in…');
    try {
      const profile = await login(form);
      if (profile?.role !== 'admin') return setMessage('Admin role required.');
      navigate('/dashboard', { replace: true });
    } catch (error) { setMessage(error.message); }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-[#07100e] p-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1a17] p-7 shadow-2xl">
        <p className="text-[10px] font-bold tracking-[.2em] text-emerald-400">GOVERNMENT JOBS</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Admin login</h1>
        <p className="mt-2 text-sm text-slate-400">Only accounts with the admin role can enter this workspace.</p>
        <form className="mt-7 grid gap-4" onSubmit={submit}>
          <input className="input" type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" required placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="button">Login</button>
          {message && <p className="text-sm text-slate-400" role="status">{message}</p>}
        </form>
      </section>
    </main>
  );
}
