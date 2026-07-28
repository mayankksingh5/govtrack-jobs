import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import JobCard from './JobCard.jsx';

const job = {
  id: 42,
  title: 'Engineer Recruitment',
  organization: 'ISRO',
  type: 'job',
  total_vacancy: 20,
  last_date: '2026-08-20',
};

describe('JobCard', () => {
  it('renders job details and accessible details link', () => {
    render(<MemoryRouter><JobCard job={job} /></MemoryRouter>);
    expect(screen.getByText('Engineer Recruitment')).toBeInTheDocument();
    expect(screen.getByText('ISRO')).toBeInTheDocument();
    expect(screen.getByText('20 vacancies')).toBeInTheDocument();
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href') === '/jobs/42')).toBe(true);
  });

  it('supports list view and absent optional fields', () => {
    const { container } = render(<MemoryRouter><JobCard job={{ id: 1 }} view="list" /></MemoryRouter>);
    expect(screen.getByText('Government Job #1')).toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(container.firstChild.className).toContain('sm:flex');
  });
});
