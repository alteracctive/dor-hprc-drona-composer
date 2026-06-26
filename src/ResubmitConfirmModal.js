import React from "react";
import ReactDOM from "react-dom";

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

function ResubmitConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
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
              <h5 className="modal-title">Resubmit Job</h5>
              <button
                type="button"
                className="close"
                onClick={onCancel}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-3">
                This job has already been submitted. Do you want to submit and run it again
                with the same configuration?
              </p>
              <div className="alert alert-warning mb-0" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <b>Warning:</b> Job files will overwrite existing files with the same name as you are resubmitting from the same job name or job ID.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary maroon-button-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary maroon-button-filled"
                onClick={onConfirm}
              >
                Resubmit
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default ResubmitConfirmModal;
