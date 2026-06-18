import React from "react";
import Label from "./Label";

const FormElementWrapper = ({ labelOnTop, name, label, help, children, useLabel = true }) => {
  const showLabel = useLabel && label;

  return (
    <div className="form-group">
      {showLabel ? (
        labelOnTop ? (
          <>
            <Label labelOnTop name={name} label={label} help={help} />
            <div>{children}</div>
          </>
        ) : (
          <div className="row">
            <Label name={name} label={label} help={help} />
            <div className="col-lg-9">{children}</div>
          </div>
        )
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
};

export default FormElementWrapper;

