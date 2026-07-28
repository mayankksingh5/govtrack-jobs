import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute.jsx';

const auth = vi.hoisted(() => ({ value: { user: null, loading: false } }));
vi.mock('./AuthContext.jsx', () => ({ useAuth: () => auth.value }));

function subject() {
  return render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/login" element={<p>Login route</p>} />
        <Route path="/private" element={<ProtectedRoute><p>Private profile</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => { auth.value = { user: null, loading: false }; });
  it('redirects anonymous users', () => {
    subject();
    expect(screen.getByText('Login route')).toBeInTheDocument();
  });
  it('renders authenticated children', () => {
    auth.value = { user: { id: '1' }, loading: false };
    subject();
    expect(screen.getByText('Private profile')).toBeInTheDocument();
  });
  it('shows loading UI while restoring a session', () => {
    auth.value = { user: null, loading: true };
    const { container } = subject();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
