import React from 'react';

function pickEventHandlers(props: Record<string, unknown>) {
  const handlers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'onPress') handlers.onClick = value;
    else if (key === 'onFocus') handlers.onFocus = value;
    else if (key === 'onBlur') handlers.onBlur = value;
    else if (key === 'onChangeText') {
      handlers.onChange = (e: { target: { value: string } }) => {
        (value as (text: string) => void)(e.target.value);
      };
    } else if (key === 'placeholder') handlers.placeholder = value;
    else if (key === 'value') handlers.value = value;
    else if (key === 'editable') {
      if (value === false) handlers.disabled = true;
    } else if (key === 'disabled') handlers.disabled = value;
    else if (key === 'placeholderTextColor') {
      // skip, not relevant for DOM
    }
  }
  return handlers;
}

function createMockComponent(name: string) {
  const component = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
    const {
      children,
      testID,
      style,
      accessibilityRole,
      accessibilityLabel,
      accessibilityState,
      activeOpacity,
      source,
      ...rest
    } = props;

    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : (style ?? {});

    const element = name === 'TextInput' ? 'input' : 'div';

    return React.createElement(
      element,
      {
        'data-testid': testID,
        'data-component': name,
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
        'aria-disabled': (accessibilityState as { disabled?: boolean } | undefined)?.disabled
          ? 'true'
          : undefined,
        style: flatStyle,
        ref,
        ...(source ? { 'data-source': JSON.stringify(source) } : {}),
        ...pickEventHandlers(rest),
      },
      children,
    );
  });
  component.displayName = name;
  return component;
}

export const View = createMockComponent('View');
export const Text = createMockComponent('Text');
export const TextInput = createMockComponent('TextInput');
export const TouchableOpacity = createMockComponent('TouchableOpacity');
export const Image = createMockComponent('Image');
export const ActivityIndicator = createMockComponent('ActivityIndicator');

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
};

export const Platform = {
  OS: 'ios' as const,
  select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
};
