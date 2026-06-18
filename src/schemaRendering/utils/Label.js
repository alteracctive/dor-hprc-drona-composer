import React from 'react';
import HelpIcon, { useHelpTooltip } from './HelpIcon';

const Label = ({ labelOnTop, name, label, help }) => {
  const { visible, scheduleShow, handleLeave, handleTooltipEnter } = useHelpTooltip(!!help);

  return(
    <label
  	className={`form-control-label ${labelOnTop ? "col-form-label" : "col-lg-3 col-form-label"}`}
 	htmlFor={name}
    >
      <span
        className={help ? 'form-control-label__help-trigger' : undefined}
        onMouseEnter={() => scheduleShow('text')}
        onMouseLeave={handleLeave}
      >
        {label}
      </span>
      {help && (
        <HelpIcon
          help={help}
          visible={visible}
          onIconMouseEnter={() => scheduleShow('icon')}
          onIconMouseLeave={handleLeave}
          onTooltipMouseEnter={handleTooltipEnter}
          onTooltipMouseLeave={handleLeave}
        />
      )}
    </label>
  );
};

export default Label;
