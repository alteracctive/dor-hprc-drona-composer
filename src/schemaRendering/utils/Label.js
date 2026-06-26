import React from 'react';
import HelpIcon, { useHelpTooltip } from './HelpIcon';

const Label = ({ labelOnTop, name, label, help }) => {
  const { visible, scheduleShow, handleLeave, handleTooltipEnter } = useHelpTooltip(!!help);

  return(
    <label
  	className={`form-control-label ${labelOnTop ? "col-form-label" : "col-lg-3 col-form-label"}`}
 	htmlFor={name}
    >
      {help ? (
        <span
          className="form-control-label__help-trigger"
          onMouseEnter={() => scheduleShow('text')}
          onMouseLeave={() => handleLeave('text')}
        >
          {label}
          <HelpIcon
            help={help}
            visible={visible}
            onIconMouseEnter={(e) => {
              scheduleShow('icon');
            }}
            onIconMouseLeave={(e) => {
              handleLeave('icon');
            }}
            onTooltipMouseEnter={handleTooltipEnter}
            onTooltipMouseLeave={() => handleLeave('tooltip')}
          />
        </span>
      ) : (
        <span>{label}</span>
      )}
    </label>
  );
};

export default Label;
