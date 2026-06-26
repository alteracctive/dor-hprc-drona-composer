import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  APPEARANCE_MODERN,
  PREFERENCES_CHANGED_EVENT,
  readAppearance,
  readHighContrastTooltip,
} from '../../userPreferences';

export const HIDE_DELAY_MS = 250;
export const SHOW_DELAY_ICON_MS = 500;
export const SHOW_DELAY_TEXT_MS = 500;

const VIEWPORT_PADDING = 12;
const TOOLTIP_GAP = 4;
const HOVER_BRIDGE_PADDING = 8;
const ARROW_SIZE = 6;

const useModernAppearance = () => {
  const [isModern, setIsModern] = useState(
    () => readAppearance() === APPEARANCE_MODERN
  );

  useEffect(() => {
    const handlePreferencesChanged = () => {
      setIsModern(readAppearance() === APPEARANCE_MODERN);
    };

    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    return () => {
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    };
  }, []);

  return isModern;
};

const useHighContrastTooltip = () => {
  const [isHighContrast, setIsHighContrast] = useState(
    () => readHighContrastTooltip()
  );

  useEffect(() => {
    const handlePreferencesChanged = () => {
      setIsHighContrast(readHighContrastTooltip());
    };

    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    return () => {
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    };
  }, []);

  return isHighContrast;
};

const iconStyle = {
  marginLeft: '3px',
  fontSize: '0.75em',
  color: '#0056b3',
  opacity: 0.6,
  cursor: 'pointer',
  transition: 'opacity 0.1s ease',
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: '1px solid #0056b3',
  borderRadius: '50%',
  padding: '2px',
  width: '1.2em',
  height: '1.2em',
  boxSizing: 'border-box',
};

export const useHelpTooltip = (enabled = true) => {
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const hoveringTextRef = useRef(false);
  const hoveringIconRef = useRef(false);
  const hoveringTooltipRef = useRef(false);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleShow = useCallback((source) => {
    if (!enabled) return;

    if (source === 'text') {
      hoveringTextRef.current = true;
    } else if (source === 'icon') {
      hoveringIconRef.current = true;
    }

    clearHideTimer();
    if (visible) return;
    clearShowTimer();
    const delay = source === 'icon' ? SHOW_DELAY_ICON_MS : SHOW_DELAY_TEXT_MS;
    showTimerRef.current = setTimeout(() => setVisible(true), delay);
  }, [clearHideTimer, clearShowTimer, enabled, visible]);

  const handleLeave = useCallback((source) => {
    clearShowTimer();

    let sourceStr = '';
    if (typeof source === 'string') {
      sourceStr = source;
    } else if (source && source.currentTarget) {
      const el = source.currentTarget;
      if (el.getAttribute('role') === 'tooltip' || el.classList.contains('help-tooltip')) {
        sourceStr = 'tooltip';
      } else if (el.innerText === '?' || el.textContent === '?') {
        sourceStr = 'icon';
      } else {
        sourceStr = 'text';
      }
    }

    if (sourceStr === 'text') {
      hoveringTextRef.current = false;
    } else if (sourceStr === 'icon') {
      hoveringIconRef.current = false;
    } else if (sourceStr === 'tooltip') {
      hoveringTooltipRef.current = false;
    } else {
      hoveringTextRef.current = false;
      hoveringIconRef.current = false;
      hoveringTooltipRef.current = false;
    }

    if (!hoveringTextRef.current && !hoveringIconRef.current && !hoveringTooltipRef.current) {
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => {
        if (!hoveringTextRef.current && !hoveringIconRef.current && !hoveringTooltipRef.current) {
          setVisible(false);
        }
      }, HIDE_DELAY_MS);
    }
  }, [clearHideTimer, clearShowTimer]);

  const handleTooltipEnter = useCallback(() => {
    hoveringTooltipRef.current = true;
    clearHideTimer();
  }, [clearHideTimer]);

  useEffect(() => {
    if (!visible) {
      hoveringTextRef.current = false;
      hoveringIconRef.current = false;
      hoveringTooltipRef.current = false;
    }
  }, [visible]);

  useEffect(() => () => {
    clearShowTimer();
    clearHideTimer();
  }, [clearHideTimer, clearShowTimer]);

  return { visible, scheduleShow, handleLeave, handleTooltipEnter };
};

const computeTooltipPosition = (anchorEl, tooltipEl) => {
  const anchor = anchorEl.getBoundingClientRect();
  const tooltip = tooltipEl.getBoundingClientRect();
  const anchorCenterX = anchor.left + anchor.width / 2;
  const maxLeft = window.innerWidth - tooltip.width - VIEWPORT_PADDING;
  let left = anchorCenterX - tooltip.width / 2;
  left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

  let placement = 'above';
  let top = anchor.top - tooltip.height - TOOLTIP_GAP;
  if (top < VIEWPORT_PADDING) {
    placement = 'below';
    top = anchor.bottom + TOOLTIP_GAP;
  }

  const arrowLeft = anchorCenterX - left;

  return { top, left, placement, arrowLeft };
};

const HelpIcon = ({
  help,
  visible,
  onIconMouseEnter,
  onIconMouseLeave,
  onTooltipMouseEnter,
  onTooltipMouseLeave,
}) => {
  const isModern = useModernAppearance();
  const isHighContrast = useHighContrastTooltip();
  const tooltipId = React.useId();
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement: 'above',
    arrowLeft: 0,
  });
  const [positioned, setPositioned] = useState(false);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !tooltipRef.current) return;
    setPosition(computeTooltipPosition(anchorRef.current, tooltipRef.current));
    setPositioned(true);
  }, []);

  useLayoutEffect(() => {
    if (!visible) {
      setPositioned(false);
      return;
    }
    updatePosition();
  }, [visible, help, updatePosition]);

  useEffect(() => {
    if (!visible) return undefined;

    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [visible, updatePosition]);

  const panelClassName = [
    'help-tooltip-panel',
    isModern ? 'help-tooltip-panel--modern' : '',
    isHighContrast ? 'help-tooltip-panel--high-contrast' : '',
  ].filter(Boolean).join(' ');

  const tooltipClassName = [
    'help-tooltip',
    `help-tooltip--${position.placement}`,
    isModern ? 'help-tooltip--modern' : '',
    isHighContrast ? 'help-tooltip--high-contrast' : '',
  ].filter(Boolean).join(' ');

  const currentIconStyle = isModern
    ? {
        ...iconStyle,
        backgroundColor: '#0056b3',
        color: '#ffffff',
        border: '1px solid #0056b3',
      }
    : iconStyle;

  return (
    <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
      <span
        ref={anchorRef}
        style={currentIconStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = 1;
          onIconMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = 0.6;
          onIconMouseLeave?.(e);
        }}
        aria-describedby={visible ? tooltipId : undefined}
      >
        ?
      </span>
      {visible && createPortal(
        <span
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          className={tooltipClassName}
          onMouseEnter={onTooltipMouseEnter}
          onMouseLeave={onTooltipMouseLeave}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 1050,
            visibility: positioned ? 'visible' : 'hidden',
            paddingBottom: position.placement === 'above' ? HOVER_BRIDGE_PADDING : 0,
            paddingTop: position.placement === 'below' ? HOVER_BRIDGE_PADDING : 0,
            '--help-tooltip-arrow-left': `${position.arrowLeft}px`,
            '--help-tooltip-arrow-size': `${ARROW_SIZE}px`,
          }}
        >
          <span className={panelClassName}>
            {help}
          </span>
          <span className="help-tooltip-arrow" aria-hidden="true" />
        </span>,
        document.body
      )}
    </span>
  );
};

export default HelpIcon;

export const useHelpTooltipHover = useHelpTooltip;
