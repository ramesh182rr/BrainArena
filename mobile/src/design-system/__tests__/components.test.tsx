import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppText, Button, Card, minTouchTarget, typography } from '..';

describe('AppText', () => {
  it('applies the variant typography and marks headings as headers', async () => {
    await render(<AppText variant="title">Explore</AppText>);
    const node = screen.getByRole('header', { name: 'Explore' });
    expect(StyleSheet.flatten(node.props.style)).toMatchObject(typography.title);
  });

  it('does not mark body text as a header', async () => {
    await render(<AppText>Plain copy</AppText>);
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.getByText('Plain copy')).toBeTruthy();
  });
});

describe('Button', () => {
  it('exposes a button role and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Play" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and reports the disabled state', async () => {
    const onPress = jest.fn();
    await render(<Button label="Play" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Play' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('meets the minimum touch target', async () => {
    await render(<Button label="Play" onPress={() => {}} testID="btn" />);
    const style = StyleSheet.flatten(screen.getByTestId('btn').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(minTouchTarget);
  });
});

describe('Card', () => {
  it('is a plain container without onPress', async () => {
    await render(
      <Card>
        <AppText>Static</AppText>
      </Card>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps its accessibility label when it is not pressable', async () => {
    await render(
      <Card accessibilityLabel="Block Escape. In development.">
        <AppText>Block Escape</AppText>
      </Card>,
    );
    expect(screen.getByLabelText('Block Escape. In development.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('becomes a labelled button with onPress', async () => {
    const onPress = jest.fn();
    await render(
      <Card onPress={onPress} accessibilityLabel="Spatial Dimension">
        <AppText>Spatial Dimension</AppText>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Spatial Dimension' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
