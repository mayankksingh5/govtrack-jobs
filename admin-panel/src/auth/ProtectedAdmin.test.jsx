import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedAdmin from './ProtectedAdmin.jsx';

const auth = vi.hoisted(() => ({ value: { user: null, loading: false } }));
vi.mock('./AuthContext.jsx', () => ({ useAdminAuth: () => auth.value }));

function renderSubject() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<p>Admin login route</p>} />
        <Route path="/dashboard" element={<ProtectedAdmin><p>Secret dashboard</p></ProtectedAdmin>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedAdmin', () => {
  beforeEach(() => { auth.value = { user: null, loading: false }; });
  it('redirects anonymous and non-admin users', () => {
    renderSubject();
    expect(screen.getByText('Admin login route')).toBeInTheDocument();
    auth.value = { user: { role: 'user' }, loading: false };
    renderSubject();
    expect(screen.getAllByText('Admin login route')).toHaveLength(2);
  });
  it('allows admins', () => {
    auth.value = { user: { role: 'admin' }, loading: false };
    renderSubject();
    expect(screen.getByText('Secret dashboard')).toBeInTheDocument();
  });
  it('renders a loading skeleton', () => {
    auth.value = { user: null, loading: true };
    const { container } = renderSubject();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
