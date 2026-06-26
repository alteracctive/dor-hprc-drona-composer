/**
 * @name Picker
 * @description A file and directory picker component that allows users to browse and select 
 * files or directories from both local and remote locations. Features a modal browser interface 
 * for navigating directory structures.
 *
 * @example
 * // File/directory picker with both local and remote options
 * {
 *   "type": "picker",
 *   "name": "outputLocation",
 *   "label": "Picker",
 *   "localLabel": "Browse Directories",
 *   "remoteLabel": "Upload File",
 *   "showFiles": "true",
 *   "defaultLocation": "$HOME",
 *   "defaultPaths": {
 *     "HomeCustom": "$HOME"
 *   },
 *   "useHPCDefaultPaths": true,
 *   "help": "Select a file or directory location"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} localLabel - Label for the local file browser button
 * @property {string} [remoteLabel] - Label for remote file upload button (if omitted, remote upload option isn't shown)
 * @property {string|boolean} [showFiles="false"] - Whether to show files in directory listings ("true" or "false")
 * @property {string} [defaultLocation] - Default path to show in the input field
 * @property {Object} [defaultPaths] - Custom paths to show as quick access buttons (key:label, value:path)
 * @property {boolean} [useHPCDefaultPaths=true] - Whether to use system default paths
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useEffect, useMemo, useState, useRef, useContext } from "react";
import { GlobalFilesContext } from "../../GlobalFilesContext";
import FormElementWrapper from "../utils/FormElementWrapper"

function Picker(props) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [pickerMode, setPickerMode] = useState("local");
  const uploadIntervalsRef = useRef({});

  useEffect(() => {
    return () => {
      if (uploadIntervalsRef.current) {
        Object.values(uploadIntervalsRef.current).forEach(clearInterval);
      }
    };
  }, []);

  useEffect(() => {
    setValue(props.defaultLocation);
  }, [props.defaultLocation]);

  const [value, setValue] = useState(
    props.name == "location" ? props.defaultLocation : ""
  );

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
  }

  const { globalFiles, setGlobalFiles } = useContext(GlobalFilesContext);

  const [currentPath, setCurrentPath] = useState("");

  const [mainPaths, setMainPaths] = useState([]);
  const [subDirs, setSubDirs] = useState([]);
  const [subFiles, setSubFiles] = useState([]);

  const remoteInput = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (pickerMode === "remote") {
      const names = uploadedFiles.map((f) => f.name).join(", ");
      setValue(names);
      if (props.onChange) {
        props.onChange(props.index, names);
      }
    }
  }, [uploadedFiles, pickerMode]);

  useEffect(() => {
    if (pickerMode === "remote" && uploadedFiles.length === 0 && value) {
      const files = value.split(",").map((f) => f.trim()).filter(Boolean);
      const initialFileObjects = files.map((filename) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: filename,
        status: "uploaded",
        progress: 100,
        file: null
      }));
      setUploadedFiles(initialFileObjects);
    }
  }, [pickerMode]);
  
  useEffect(() => {
    let url = document.dashboard_url + "/jobs/composer/mainpaths";
    const searchParams = new URLSearchParams();

    const useHPCDefaultPaths = props.useHPCDefaultPaths ?? true;
    searchParams.append('useHPCDefaultPaths', useHPCDefaultPaths);

    if (props.defaultPaths && typeof props.defaultPaths === 'object') {
      searchParams.append('defaultPaths', JSON.stringify(props.defaultPaths));
    }

    url += `?${searchParams.toString()}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const paths = Object.entries(data);
        setMainPaths(paths);
      });
  }, [props.defaultPaths, props.useHPCDefaultPaths]);


  function handleMainClick(event) {
    let fullPath = event.target.value;
    setCurrentPath(fullPath);
    fetch(
      document.dashboard_url +
        "/jobs/composer/subdirectories?path=" +
        encodeURIComponent(fullPath),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const subdirs = Object.entries(data.subdirectories).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        const subfiles = Object.entries(data.subfiles).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        setSubDirs(subdirs);
        setSubFiles(subfiles);
      });
  }

  function handleSubDirsClick(event) {
    const fullPath = event.target.value;
    setCurrentPath(fullPath);
    fetch(
      document.dashboard_url +
        "/jobs/composer/subdirectories?path=" +
        encodeURIComponent(fullPath),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const subdirs = Object.entries(data.subdirectories).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        const subfiles = Object.entries(data.subfiles).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        setSubDirs(subdirs);
        setSubFiles(subfiles);
      });
  }

  function handleSubFilesClick(event) {
    const fullPath = event.target.value;
    setCurrentPath(fullPath);
  }

  function handleBackClick() {
    const path = currentPath.split("/");
    path.pop();
    const newPath = path.join("/");
    setCurrentPath(newPath);
    fetch(
      document.dashboard_url +
        "/jobs/composer/subdirectories?path=" +
        encodeURIComponent(newPath),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const subdirs = Object.entries(data.subdirectories).map((path) => [
          path[1],
          newPath + "/" + path[1],
        ]);
        const subfiles = Object.entries(data.subfiles).map((path) => [
          path[1],
          newPath + "/" + path[1],
        ]);
        setSubDirs(subdirs);
        setSubFiles(subfiles);
      });
  }

  function handleRemoveUploadedFile(fileObj) {
    if (uploadIntervalsRef.current[fileObj.id]) {
      clearInterval(uploadIntervalsRef.current[fileObj.id]);
      delete uploadIntervalsRef.current[fileObj.id];
    }
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileObj.id));
    if (fileObj.file) {
      setGlobalFiles((prevFiles) => prevFiles.filter((f) => f !== fileObj.file));
    }
  }

  function handleSaveChange() {
    setPickerMode("local");
    setValue(currentPath);
    if (props.onChange) props.onChange(props.index, currentPath);
  }

  function handleFileChange(files) {
    const filesArray = Array.from(files);
    const newFileObjects = filesArray.map((file) => {
      const id = Math.random().toString(36).substr(2, 9);
      return {
        id,
        file,
        name: file.name,
        status: "uploading",
        progress: 0,
      };
    });

    setUploadedFiles((prev) => [...prev, ...newFileObjects]);
    setGlobalFiles((prevFiles) => [...prevFiles, ...filesArray]);

    newFileObjects.forEach((fileObj) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 30) + 15;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          delete uploadIntervalsRef.current[fileObj.id];
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === fileObj.id ? { ...f, status: "uploaded", progress: 100 } : f))
          );
        } else {
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === fileObj.id ? { ...f, progress: currentProgress } : f))
          );
        }
      }, 150);
      uploadIntervalsRef.current[fileObj.id] = interval;
    });
  }

  function handleRemoteClick() {
    setPickerMode("remote");
    if (remoteInput.current) {
      remoteInput.current.value = "";
    }
    remoteInput.current.click();
  }
    
  
  // Returns false if showFiles is undefined, returns true if showFiles is boolean and true or is a string its toLowerCase is "true"
  const isShowFiles = Boolean(props.showFiles) && props.showFiles.toString().toLowerCase() === "true";
  const showRemoteLabel = props.remoteLabel ? true : false;

  return (
    <div>
      <FormElementWrapper
        labelOnTop={props.labelOnTop}
        name={props.name}
        label={props.label}
        help={props.help}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {showRemoteLabel && (
            <button
              type="button"
              className="btn btn-primary maroon-button"
              style={{ marginRight: "2px" }}
              onClick={handleRemoteClick}
            >
              {props.remoteLabel}
            </button>
          )}
          <input
            type="file"
            style={{ display: "none" }}
            multiple
            ref={remoteInput}
            onChange={(e) => handleFileChange(e.target.files)}
          />
          <button
            type="button"
            className="btn btn-primary maroon-button"
            data-toggle="modal"
            data-target={"#local-file-picker-modal-" + props.name}
            style={{ marginRight: "2px" }}
          >
            {props.localLabel}
          </button>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input
              type="text"
              name={props.name}
              id={props.id || props.name}
              value={value}
              className="form-control"
              onChange={handleValueChange}
              ref={inputRef}
              readOnly={props.disableChange || pickerMode === "remote"}
              placeholder={pickerMode === "remote" ? "No files uploaded" : ""}
            />
            {pickerMode === "remote" && uploadedFiles.length > 0 && (
              <div style={{
                border: "1px solid #ced4da",
                borderRadius: "0.25rem",
                padding: "0.375rem 0.75rem",
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                {uploadedFiles.map((fileObj, idx) => (
                  <div key={fileObj.id || idx} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.9rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      <span className="file-picker-explorer__icon file-picker-explorer__icon--file" aria-hidden="true" />
                      <span style={{
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        fontWeight: "500",
                        color: "#333"
                      }} title={fileObj.name}>
                        {fileObj.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                      {fileObj.status === "uploading" && (
                        <span style={{ color: "#007bff", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }}>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "12px", height: "12px", borderWidth: "1.5px" }}></span>
                          {fileObj.progress}%
                        </span>
                      )}
                      {fileObj.status === "uploaded" && (
                        <span style={{ color: "#28a745", fontWeight: "bold", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          ✓ Uploaded
                        </span>
                      )}
                      {fileObj.status === "failed" && (
                        <span style={{ color: "#dc3545", fontWeight: "bold", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          ✗ Failed
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveUploadedFile(fileObj)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc3545",
                          cursor: "pointer",
                          padding: "0 4px",
                          fontSize: "1.1rem",
                          lineHeight: "1",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                        title="Remove file"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: "0.8rem", color: "#6c757d", display: "flex", justifyContent: "space-between", marginTop: "4px", borderTop: "1px solid #dee2e6", paddingTop: "4px" }}>
                  <span>Total uploaded: {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </FormElementWrapper> 
      <div
        className="modal fade"
        id={"local-file-picker-modal-" + props.name}
        tabIndex="-1"
        role="dialog"
        aria-labelledby="localFilePickerModal"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">
                {props.label} 
              </h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="container">
                <div className="form-group row">
                  <input
                    type="text"
                    value={currentPath}
                    className="form-control col-lg-10"
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-secondary col-lg-2"
                    onClick={handleBackClick}
                  >
                    Back
                  </button>
                </div>

                {mainPaths.map((path) => (
                  <button
                    key={path[1]}
                    type="button"
                    className="btn btn-primary"
                    value={path[1]}
                    onClick={handleMainClick}
                    style={{ marginRight: "2px", marginBottom: "2px" }}
                  >
                    {path[0]}
                  </button>
                ))}
                <br />
                {subDirs.map((path) => (
                  <button
                    key={path[1]}
                    type="button"
                    className="btn btn-outline-primary"
                    value={path[1]}
                    onClick={handleSubDirsClick}
                    style={{ marginRight: "2px", marginBottom: "2px" }}
                  >
                    {path[0]}
                  </button>
                ))}
                {isShowFiles &&
                  subFiles.map((path) => (
                    <button
                      key={path[1]}
                      type="button"
                      className="btn btn-outline-secondary"
                      value={path[1]}
                      onClick={handleSubFilesClick}
                      style={{ marginRight: "2px", marginBottom: "2px" }}
                    >
                      {path[0]}
                    </button>
                  ))}
                <br />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-dismiss="modal"
                onClick={handleSaveChange}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Picker;
