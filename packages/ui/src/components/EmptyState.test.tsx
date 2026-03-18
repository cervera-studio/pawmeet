import { fireEvent, render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No dogs nearby" testID="empty" />);
    expect(screen.getByText('No dogs nearby')).toBeTruthy();
  });

  it('renders the description when provided', () => {
    render(
      <EmptyState title="No matches" description="Try adjusting your filters" testID="empty" />,
    );
    expect(screen.getByText('Try adjusting your filters')).toBeTruthy();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Empty" testID="empty" />);
    // Only the title text should exist
    const container = screen.getByTestId('empty');
    expect(container.textContent).toBe('Empty');
  });

  it('renders an action button when actionLabel and onAction are provided', () => {
    const onAction = vi.fn();
    render(
      <EmptyState title="No results" actionLabel="Retry" onAction={onAction} testID="empty" />,
    );
    expect(screen.getByTestId('empty-action')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('does not render an action button when actionLabel is missing', () => {
    render(
      <EmptyState
        title="No results"
        onAction={() => {
          /* noop */
        }}
        testID="empty"
      />,
    );
    expect(screen.queryByTestId('empty-action')).toBeNull();
  });

  it('does not render an action button when onAction is missing', () => {
    render(<EmptyState title="No results" actionLabel="Retry" testID="empty" />);
    expect(screen.queryByTestId('empty-action')).toBeNull();
  });

  it('calls onAction when the action button is pressed', () => {
    const onAction = vi.fn();
    render(
      <EmptyState title="No results" actionLabel="Retry" onAction={onAction} testID="empty" />,
    );
    fireEvent.click(screen.getByTestId('empty-action'));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('has summary accessibility role on the container', () => {
    render(<EmptyState title="Empty" testID="empty" />);
    expect(screen.getByTestId('empty')).toHaveAttribute('role', 'summary');
  });
});
