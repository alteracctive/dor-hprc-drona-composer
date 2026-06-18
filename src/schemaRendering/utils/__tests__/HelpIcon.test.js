import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import HelpIcon, {
  useHelpTooltip,
  HIDE_DELAY_MS,
  SHOW_DELAY_ICON_MS,
  SHOW_DELAY_TEXT_MS,
} from '../HelpIcon';
import Label from '../Label';
import { APPEARANCE_CLASSIC, APPEARANCE_MODERN, saveAppearance, saveHighContrastTooltip } from '../../../userPreferences';

function HoverTestHarness() {
  const { visible, scheduleShow, handleLeave, handleTooltipEnter } = useHelpTooltip(true);
  return (
    <div data-testid="hover-target">
      <span
        data-testid="label-text"
        onMouseEnter={() => scheduleShow('text')}
        onMouseLeave={handleLeave}
      >
        Label text
      </span>
      <HelpIcon
        help="This is help text"
        visible={visible}
        onIconMouseEnter={() => scheduleShow('icon')}
        onIconMouseLeave={handleLeave}
        onTooltipMouseEnter={handleTooltipEnter}
        onTooltipMouseLeave={handleLeave}
      />
    </div>
  );
}

describe('HelpIcon', () => {
  const helpText = 'This is help text';

  afterEach(() => {
    act(() => {
      saveAppearance(APPEARANCE_CLASSIC);
      saveHighContrastTooltip(false);
    });
  });

  test('does not show tooltip when not visible', () => {
    render(<HelpIcon help={helpText} visible={false} />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('shows tooltip when visible', () => {
    render(<HelpIcon help={helpText} visible={true} />);
    expect(screen.getByRole('tooltip')).toHaveTextContent(helpText);
  });

  test('renders a wide tooltip panel', () => {
    render(<HelpIcon help={helpText} visible={true} />);
    const panel = screen.getByRole('tooltip').querySelector('.help-tooltip-panel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass('help-tooltip-panel');
  });

  test('uses modern tooltip styling when modern appearance is enabled', () => {
    act(() => {
      saveAppearance(APPEARANCE_MODERN);
    });
    render(<HelpIcon help={helpText} visible={true} />);
    const panel = screen.getByRole('tooltip').querySelector('.help-tooltip-panel');
    expect(panel).toHaveClass('help-tooltip-panel--modern');
  });

  test('uses high contrast tooltip styling when enabled', () => {
    act(() => {
      saveHighContrastTooltip(true);
    });
    render(<HelpIcon help={helpText} visible={true} />);
    const panel = screen.getByRole('tooltip').querySelector('.help-tooltip-panel');
    expect(panel).toHaveClass('help-tooltip-panel--high-contrast');
    expect(screen.getByRole('tooltip')).toHaveClass('help-tooltip--high-contrast');
  });
});

describe('useHelpTooltip', () => {
  const helpText = 'This is help text';

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not show tooltip initially', () => {
    render(<HoverTestHarness />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('shows tooltip after icon hover delay', () => {
    render(<HoverTestHarness />);
    fireEvent.mouseEnter(screen.getByText('?'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_ICON_MS - 1);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent(helpText);
  });

  test('shows tooltip after label text hover delay', () => {
    render(<HoverTestHarness />);
    fireEvent.mouseEnter(screen.getByTestId('label-text'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_TEXT_MS - 1);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent(helpText);
  });

  test('cancels pending show when mouse leaves before delay', () => {
    render(<HoverTestHarness />);
    fireEvent.mouseEnter(screen.getByText('?'));
    fireEvent.mouseLeave(screen.getByText('?'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_ICON_MS);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('hides tooltip after delay on mouse leave', () => {
    render(<HoverTestHarness />);
    fireEvent.mouseEnter(screen.getByText('?'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_ICON_MS);
    });

    fireEvent.mouseLeave(screen.getByText('?'));

    act(() => {
      jest.advanceTimersByTime(HIDE_DELAY_MS);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('cancels hide when re-entering tooltip before delay', () => {
    render(<HoverTestHarness />);
    fireEvent.mouseEnter(screen.getByText('?'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_ICON_MS);
    });

    fireEvent.mouseLeave(screen.getByText('?'));
    fireEvent.mouseEnter(screen.getByRole('tooltip'));

    act(() => {
      jest.advanceTimersByTime(HIDE_DELAY_MS);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('uses shorter delay when moving from label text to icon', () => {
    render(<HoverTestHarness />);
    fireEvent.mouseEnter(screen.getByTestId('label-text'));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent.mouseLeave(screen.getByTestId('label-text'));
    fireEvent.mouseEnter(screen.getByText('?'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_ICON_MS);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});

describe('Label', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows tooltip after hovering label text for the text delay', () => {
    render(<Label name="field" label="Field Name" help="Helper text" />);

    fireEvent.mouseEnter(screen.getByText('Field Name'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_TEXT_MS);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Helper text');
  });

  test('shows tooltip faster when hovering the icon', () => {
    render(<Label name="field" label="Field Name" help="Helper text" />);

    fireEvent.mouseEnter(screen.getByText('?'));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_ICON_MS);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Helper text');
  });
});
