import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders the label when provided', () => {
    render(<Input label="Email" testID="input" />);
    expect(screen.getByTestId('input-label')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('does not render a label when none is provided', () => {
    render(<Input testID="input" />);
    expect(screen.queryByTestId('input-label')).toBeNull();
  });

  it('renders the text input element', () => {
    render(<Input testID="input" />);
    expect(screen.getByTestId('input-input')).toBeTruthy();
  });

  it('shows error message when error prop is set', () => {
    render(<Input error="Required field" testID="input" />);
    expect(screen.getByTestId('input-error')).toBeTruthy();
    expect(screen.getByText('Required field')).toBeTruthy();
  });

  it('does not show error message when no error', () => {
    render(<Input testID="input" />);
    expect(screen.queryByTestId('input-error')).toBeNull();
  });

  it('applies error border style when error is present', () => {
    render(<Input error="Invalid" testID="input" />);
    const input = screen.getByTestId('input-input');
    expect(input).toHaveStyle({ borderColor: '#FF3B30' });
  });

  it('applies default border style when no error and not focused', () => {
    render(<Input testID="input" />);
    const input = screen.getByTestId('input-input');
    expect(input).toHaveStyle({ borderColor: '#C7C7CC' });
  });

  it('applies focus border style on focus', () => {
    render(<Input testID="input" />);
    const input = screen.getByTestId('input-input');
    fireEvent.focus(input);
    expect(input).toHaveStyle({ borderColor: '#065F46' });
  });

  it('reverts to default border on blur', () => {
    render(<Input testID="input" />);
    const input = screen.getByTestId('input-input');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input).toHaveStyle({ borderColor: '#C7C7CC' });
  });

  it('calls external onFocus and onBlur handlers', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(<Input onFocus={onFocus} onBlur={onBlur} testID="input" />);
    const input = screen.getByTestId('input-input');

    fireEvent.focus(input);
    expect(onFocus).toHaveBeenCalledOnce();

    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('sets accessibility label from the label prop', () => {
    render(<Input label="Password" testID="input" />);
    expect(screen.getByTestId('input-input')).toHaveAttribute('aria-label', 'Password');
  });
});
