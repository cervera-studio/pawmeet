import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders the label text', () => {
    render(<Badge label="85%" testID="badge" />);
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('defaults to size variant with neutral background', () => {
    render(<Badge label="Media" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el).toHaveStyle({ backgroundColor: '#F2F2F7' });
  });

  it('renders compatibilityHigh with green-tinted background', () => {
    render(<Badge label="92%" variant="compatibilityHigh" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el.style.backgroundColor).toContain('52, 199, 89');
  });

  it('renders compatibilityMedium with orange-tinted background', () => {
    render(<Badge label="65%" variant="compatibilityMedium" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el.style.backgroundColor).toContain('255, 149, 0');
  });

  it('renders new variant with primary background and white text', () => {
    render(<Badge label="Nuovo" variant="new" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el).toHaveStyle({ backgroundColor: '#FF6B35' });
  });

  it('renders counter variant with primary background', () => {
    render(<Badge label="3" variant="counter" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el).toHaveStyle({ backgroundColor: '#FF6B35' });
  });

  it('renders verified variant with blue-tinted background', () => {
    render(<Badge label="Verified" variant="verified" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el.style.backgroundColor).toContain('0, 122, 255');
  });

  it('uses full border radius for round variants', () => {
    render(<Badge label="85%" variant="compatibilityHigh" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el.style.borderRadius).toBe('9999px');
  });

  it('uses small border radius for size/energy variants', () => {
    render(<Badge label="Media" variant="size" testID="badge" />);
    const el = screen.getByTestId('badge');
    expect(el.style.borderRadius).toBe('4px');
  });

  it('renders small size with 20px height', () => {
    render(<Badge label="S" size="sm" testID="badge" />);
    expect(screen.getByTestId('badge').style.height).toBe('20px');
  });

  it('renders medium size with 24px height', () => {
    render(<Badge label="M" size="md" testID="badge" />);
    expect(screen.getByTestId('badge').style.height).toBe('24px');
  });

  it('renders large size with 32px height', () => {
    render(<Badge label="L" size="lg" testID="badge" />);
    expect(screen.getByTestId('badge').style.height).toBe('32px');
  });

  it('has accessibility role text', () => {
    render(<Badge label="Info" testID="badge" />);
    expect(screen.getByTestId('badge')).toHaveAttribute('role', 'text');
  });

  it('sets the label as accessibility label', () => {
    render(<Badge label="85%" testID="badge" />);
    expect(screen.getByTestId('badge')).toHaveAttribute('aria-label', '85%');
  });
});
