import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders with default medium size (40px)', () => {
    render(<Avatar testID="avatar" />);
    const el = screen.getByTestId('avatar');
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });

  it('renders at each supported size', () => {
    const sizes: Array<{ size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'; px: string }> = [
      { size: 'xs', px: '24px' },
      { size: 'sm', px: '32px' },
      { size: 'md', px: '40px' },
      { size: 'lg', px: '48px' },
      { size: 'xl', px: '64px' },
      { size: '2xl', px: '96px' },
    ];

    for (const { size, px } of sizes) {
      const { unmount } = render(<Avatar size={size} testID="avatar" />);
      const el = screen.getByTestId('avatar');
      expect(el.style.width).toBe(px);
      expect(el.style.height).toBe(px);
      unmount();
    }
  });

  it('renders a placeholder when no source is provided', () => {
    render(<Avatar testID="avatar" />);
    const el = screen.getByTestId('avatar');
    // No image child should be present
    expect(screen.queryByTestId('avatar-image')).toBeNull();
    // Should have a placeholder background color
    expect(el.style.backgroundColor).toBeTruthy();
  });

  it('uses dog placeholder color when type is dog', () => {
    render(<Avatar testID="avatar" type="dog" />);
    const el = screen.getByTestId('avatar');
    // Dog placeholder uses primary50 (#FFF3ED)
    expect(el).toHaveStyle({ backgroundColor: '#FFF3ED' });
  });

  it('uses user placeholder color when type is user', () => {
    render(<Avatar testID="avatar" type="user" />);
    const el = screen.getByTestId('avatar');
    // User placeholder uses neutral200 (#E5E5EA)
    expect(el).toHaveStyle({ backgroundColor: '#E5E5EA' });
  });

  it('renders an image when source is provided', () => {
    render(<Avatar source={{ uri: 'https://example.com/dog.jpg' }} testID="avatar" />);
    expect(screen.getByTestId('avatar-image')).toBeTruthy();
  });

  it('applies a white border when bordered is true', () => {
    render(<Avatar bordered testID="avatar" />);
    const el = screen.getByTestId('avatar');
    expect(el).toHaveStyle({ borderWidth: '2px', borderColor: '#FFFFFF' });
  });

  it('has circular border radius equal to half the dimension', () => {
    render(<Avatar size="xl" testID="avatar" />);
    const el = screen.getByTestId('avatar');
    // xl = 64px, borderRadius = 32
    expect(el.style.borderRadius).toBe('32px');
  });

  it('sets accessibility role to image', () => {
    render(<Avatar testID="avatar" />);
    expect(screen.getByTestId('avatar')).toHaveAttribute('role', 'image');
  });

  it('sets correct accessibility label for dog type', () => {
    render(<Avatar type="dog" testID="avatar" />);
    expect(screen.getByTestId('avatar')).toHaveAttribute('aria-label', 'Dog avatar');
  });

  it('sets correct accessibility label for user type', () => {
    render(<Avatar type="user" testID="avatar" />);
    expect(screen.getByTestId('avatar')).toHaveAttribute('aria-label', 'User avatar');
  });
});
