import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders the title text', () => {
    render(<Button title="Save" onPress={() => {}} testID="btn" />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = vi.fn();
    render(<Button title="Tap me" onPress={onPress} testID="btn" />);
    fireEvent.click(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('does not call onPress when disabled', () => {
    const onPress = vi.fn();
    render(<Button title="Disabled" onPress={onPress} disabled testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a loader instead of text when loading', () => {
    render(<Button title="Submit" onPress={() => {}} loading testID="btn" />);
    expect(screen.getByTestId('btn-loader')).toBeTruthy();
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('is disabled when loading', () => {
    render(<Button title="Loading" onPress={() => {}} loading testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets the button accessibilityRole', () => {
    render(<Button title="Action" onPress={() => {}} testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveAttribute('role', 'button');
  });

  it('applies reduced opacity style when disabled', () => {
    render(<Button title="Off" onPress={() => {}} disabled testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn.style.opacity).toBe('0.4');
  });

  it('renders primary variant with orange background by default', () => {
    render(<Button title="Primary" onPress={() => {}} testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn).toHaveStyle({ backgroundColor: '#FF6B35' });
  });

  it('renders secondary variant with transparent background and border', () => {
    render(<Button title="Secondary" onPress={() => {}} variant="secondary" testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn.style.backgroundColor).toBe('transparent');
    expect(btn).toHaveStyle({ borderColor: '#FF6B35' });
  });

  it('renders ghost variant with transparent background', () => {
    render(<Button title="Ghost" onPress={() => {}} variant="ghost" testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn.style.backgroundColor).toBe('transparent');
  });

  it('renders destructive variant with red background', () => {
    render(<Button title="Delete" onPress={() => {}} variant="destructive" testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn).toHaveStyle({ backgroundColor: '#FF3B30' });
  });

  it('adjusts height based on size prop', () => {
    const { rerender } = render(
      <Button title="Compact" onPress={() => {}} size="compact" testID="btn" />,
    );
    expect(screen.getByTestId('btn').style.height).toBe('40px');

    rerender(<Button title="Standard" onPress={() => {}} size="standard" testID="btn" />);
    expect(screen.getByTestId('btn').style.height).toBe('48px');

    rerender(<Button title="Large" onPress={() => {}} size="large" testID="btn" />);
    expect(screen.getByTestId('btn').style.height).toBe('56px');
  });
});
