import { useEffect, useState } from 'react';
import { updateProfile } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SEO from '../components/SEO.jsx';

const join = (value) => (value || []).join(', ');
const split = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function Profile() {
  const { user, reloadProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (user) setForm({
      name: user.name || '', avatar_url: user.avatar_url || '', qualification: user.qualification || '',
      skills: join(user.skills), preferred_states: join(user.preferred_states),
      preferred_organizations: join(user.preferred_organizations),
    });
  }, [user]);
  if (!form) return null;
  const submit = async (event) => {
    event.preventDefault();
    setMessage('Saving…');
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
      setMessage('Profile updated.');
    } catch (error) { setMessage(error.message); }
  };
  return (
    <>
      <SEO title="Your Profile" description="Manage your Government Jobs Portal preferences." path="/profile" />
      <div className="container max-w-4xl py-10">
        <Breadcrumbs items={[{ label: 'Profile' }]} />
        <div className="page-heading"><h1>Your Profile</h1><p>{user.email} · {user.role}</p></div>
        <form onSubmit={submit} className="panel mt-8 grid gap-4 sm:grid-cols-2">
          <input className="input" required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" type="url" placeholder="Avatar HTTPS URL" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Skills, comma separated" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          <input className="input" placeholder="Preferred states" value={form.preferred_states} onChange={(e) => setForm({ ...form, preferred_states: e.target.value })} />
          <input className="input" placeholder="Preferred organizations" value={form.preferred_organizations} onChange={(e) => setForm({ ...form, preferred_organizations: e.target.value })} />
          <button className="button sm:col-span-2">Save profile</button>
          {message && <p className="text-sm text-[#667771] sm:col-span-2" role="status">{message}</p>}
        </form>
      </div>
    </>
  );
}
