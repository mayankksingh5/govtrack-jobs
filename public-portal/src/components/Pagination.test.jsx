import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.jsx';

describe('Pagination', () => {
  it('hides a single page', () => {
    const { container } = render(<Pagination page={1} pages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('moves between pages and disables boundaries', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Pagination page={2} pages={3} onChange={onChange} />);
    fireEvent.click(screen.getByText('Previous'));
    fireEvent.click(screen.getByText('Next'));
    expect(onChange).toHaveBeenNthCalledWith(1, 1);
    expect(onChange).toHaveBeenNthCalledWith(2, 3);
    rerender(<Pagination page={1} pages={3} onChange={onChange} />);
    expect(screen.getByText('Previous')).toBeDisabled();
  });
});
