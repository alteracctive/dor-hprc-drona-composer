import React, { useState } from "react";
import ReactDOM from "react-dom";
import { saveWarnOnPreviewScriptChanges } from "./userPreferences";

const Portal = ({ children }) => {
  const el = React.useMemo(() => document.createElement("div"), []);

  React.useEffect(() => {
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);

  return ReactDOM.createPortal(children, el);
};

function PreviewScriptChangeModal({ isOpen, onConfirm, onCancel }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (dontShowAgain) {
      saveWarnOnPreviewScriptChanges(false);
    }
    setDontShowAgain(false);
    onConfirm();
  };

  const handleCancel = () => {
    setDontShowAgain(false);
    onCancel();
  };

  return (
    <Portal>
      <div
        className="modal fade show"
        tabIndex="-1"
        onClick={handleBackdropClick}
        style={{
          display: "block",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1050,
        }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Discard script changes?</h5>
              <button
                type="button"
                className="close"
                onClick={handleCancel}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-3">
                Going back will discard your edits to the generated preview scripts.
                They will be regenerated the next time you preview the job.
              </p>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="preview-script-change-dont-show"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="preview-script-change-dont-show">
                  Don&apos;t show this again
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary maroon-button-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary maroon-button-filled"
                onClick={handleConfirm}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default PreviewScriptChangeModal;
