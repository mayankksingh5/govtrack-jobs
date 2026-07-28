import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Card,
  EmptyState,
  ErrorState,
  MetricCard,
  Modal,
  PageHeader,
  Skeleton,
} from './UI.jsx';

describe('shared admin UI', () => {
  it('renders headers, cards, metrics, skeletons, and empty states', () => {
    render(<><PageHeader title="Jobs" description="All jobs" action={<button>Action</button>} /><Card>Body</Card><MetricCard label="Total" value="12" tone="green" detail="Published" /><Skeleton rows={2} /><EmptyState title="Empty" description="Nothing here" /></>);
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('12')).toHaveClass('text-emerald-600');
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(document.querySelectorAll('.animate-pulse > div')).toHaveLength(2);
  });

  it('retries errors', () => {
    const retry = vi.fn();
    render(<ErrorState message="Failed" retry={retry} />);
    fireEvent.click(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });

  it('opens and closes a modal by button, backdrop, and escape', () => {
    const close = vi.fn();
    const { rerender } = render(<Modal open={false} onClose={close} title="Details">Body</Modal>);
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
    rerender(<Modal open onClose={close} title="Details">Body</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByText('Close'));
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement);
    expect(close).toHaveBeenCalledTimes(3);
  });
});
