import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateProfile } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SEO from '../components/SEO.jsx';

const join = (value) => (value || []).join(', ');
const split = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function Profile() {
  const { user, reloadProfile, logout } = useAuth();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState({ text: '' });
  useEffect(() => {
    if (user) setForm({
      name: user.name || '', avatar_url: user.avatar_url || '', qualification: user.qualification || '',
      skills: join(user.skills), preferred_states: join(user.preferred_states),
      preferred_organizations: join(user.preferred_organizations),
    });
  }, [user]);
  if (!form) return null;
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: 'Saving…' });
    try {
      await updateProfile({
        ...form,
        avatar_url: form.avatar_url || null,
        qualification: form.qualification || null,
        skills: split(form.skills),
        preferred_states: split(form.preferred_states),
        preferred_organizations: split(form.preferred_organizations),
      });
      await reloadProfile();
      setMessage({ text: 'Profile updated.' });
    } catch (error) { setMessage({ text: error.message, error: true }); }
  };
  return (
    <main className="container form-page">
      <SEO title="Your Profile" description="Manage your GovTrack Jobs preferences." path="/profile" />
      <Breadcrumbs items={[{ label: 'Profile' }]} />
      <div className="form-card wide">
        <span>YOUR ACCOUNT</span>
        <h1>{user.name || 'Your profile'}</h1>
        <p>
          {user.email} · <Link className="text-link" to="/saved-jobs">Saved jobs</Link> ·{' '}
          <Link className="text-link" to="/applied-jobs">Applied jobs</Link> ·{' '}
          <Link className="text-link" to="/recently-viewed">Recently viewed</Link> ·{' '}
          <Link className="text-link" to="/for-you">For you</Link>
        </p>
        <form onSubmit={submit} className="form-grid two">
          <label className="field"><span>Name</span><input required value={form.name} onChange={set('name')} /></label>
          <label className="field"><span>Avatar HTTPS URL</span><input type="url" value={form.avatar_url} onChange={set('avatar_url')} /></label>
          <label className="field span-2"><span>Qualification</span><input value={form.qualification} onChange={set('qualification')} placeholder="e.g. Graduate" /></label>
          <label className="field span-2"><span>Skills (comma separated)</span><input value={form.skills} onChange={set('skills')} /></label>
          <label className="field"><span>Preferred states</span><input value={form.preferred_states} onChange={set('preferred_states')} /></label>
          <label className="field"><span>Preferred organizations</span><input value={form.preferred_organizations} onChange={set('preferred_organizations')} /></label>
          <button className="button primary span-2">Save profile</button>
          <button type="button" className="button secondary span-2" onClick={logout}>Logout</button>
          {message.text && <p className={`form-message span-2 ${message.error ? 'error' : ''}`} role="status">{message.text}</p>}
        </form>
      </div>
    </main>
  );
}
