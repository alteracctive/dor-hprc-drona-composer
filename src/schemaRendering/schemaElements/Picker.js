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

import React, { useEffect, useMemo, useState, useRef, useContext, useCallback } from "react";
import { GlobalFilesContext } from "../../GlobalFilesContext";
import FormElementWrapper from "../utils/FormElementWrapper"

function buildBreadcrumbs(path) {
  if (!path) {
    return [];
  }

  const parts = path.split("/").filter(Boolean);
  const crumbs = [];
  let acc = "";

  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : `/${part}`;
    crumbs.push({ label: part, path: acc });
  }

  return crumbs;
}

function isSidebarPathActive(currentPath, suggestedPath) {
  if (!suggestedPath) {
    return false;
  }

  return currentPath === suggestedPath;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
    </svg>
  );
}

function Picker(props) {
  const [uploadedFiles, setUploadedFiles] = useState([]);

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
    let currentFile = remoteInput.current.files[0];
    if (currentFile) {
      let path = currentFile.webkitRelativePath
        ? currentFile.webkitRelativePath
        : currentFile.name;
      inputRef.current.value = path;
      setValue(path);
      setGlobalFiles((prevFiles) => [...prevFiles, currentFile]);
      if (props.onChange) {
        props.onChange(props.index, path);
      }
    }
  }, [uploadedFiles]);

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

  const loadDirectory = useCallback((fullPath) => {
    setCurrentPath(fullPath);

    if (!fullPath) {
      setSubDirs([]);
      setSubFiles([]);
      return Promise.resolve();
    }

    return fetch(
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
  }, []);

  function handleSuggestedPathClick(fullPath) {
    loadDirectory(fullPath);
  }

  function handleFolderClick(fullPath) {
    loadDirectory(fullPath);
  }

  function handleFileClick(fullPath) {
    setCurrentPath(fullPath);
    setSubDirs([]);
    setSubFiles([]);
  }

  function handleBackClick() {
    const pathParts = currentPath.split("/");
    pathParts.pop();
    const newPath = pathParts.join("/");
    loadDirectory(newPath);
  }

  function handleBreadcrumbClick(path) {
    if (path !== currentPath) {
      loadDirectory(path);
    }
  }

  function handleSaveChange() {
    setValue(currentPath);
    if (props.onChange) props.onChange(props.index, currentPath);
  }

  function handleRemoteClick() {
    let currentFiles = remoteInput.current.files;
    for (let i = 0; i < currentFiles.length; i++) {
      setUploadedFiles((prevFiles) => {
        let fileToRemove = currentFiles[i];
        let indexToRemove = prevFiles.indexOf(fileToRemove);
        prevFiles.splice(indexToRemove, 1);
        return prevFiles;
      });
      setGlobalFiles((prevFiles) => {
        let fileToRemove = currentFiles[i];
        let indexToRemove = prevFiles.indexOf(fileToRemove);
        prevFiles.splice(indexToRemove, 1);
        return prevFiles;
      });
    }

    remoteInput.current.click();
  }

  function handleFileChange(files) {
    const filesArray = Array.from(files);
    let newFiles = [];
    filesArray.forEach((file) => {
      newFiles.push(file);
      setUploadedFiles((prevFiles) => [...prevFiles, file]);
    });
  }

  // Returns false if showFiles is undefined, returns true if showFiles is boolean and true or is a string its toLowerCase is "true"
  const isShowFiles = Boolean(props.showFiles) && props.showFiles.toString().toLowerCase() === "true";
  const showRemoteLabel = props.remoteLabel ? true : false;

  // "local" = open cluster browser modal, "remote" = upload local file
  const [pickerMode, setPickerMode] = useState("local");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = pickerMode === "local" ? props.localLabel : props.remoteLabel;
  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath]);
  const isListEmpty = subDirs.length === 0 && (!isShowFiles || subFiles.length === 0);

  function initializePickerFromValue(selectedPath) {
    const trimmed = (selectedPath || "").trim();

    if (!trimmed) {
      setCurrentPath("");
      setSubDirs([]);
      setSubFiles([]);
      return;
    }

    if (isShowFiles && trimmed.includes("/")) {
      const parentPath = trimmed.slice(0, trimmed.lastIndexOf("/"));
      if (parentPath) {
        loadDirectory(parentPath).then(() => {
          setCurrentPath(trimmed);
        });
        return;
      }
    }

    loadDirectory(trimmed);
  }

  function handleMainButtonClick() {
    if (props.disableChange) return;
    if (pickerMode === "local") {
      initializePickerFromValue(value);
      const modalEl = document.getElementById("local-file-picker-modal-" + props.name);
      if (modalEl && window.$) window.$(modalEl).modal("show");
    } else {
      handleRemoteClick();
    }
  }

  function handleSelectMode(mode) {
    setPickerMode(mode);
    setDropdownOpen(false);
  }

  return (
    <div>
      <FormElementWrapper
        labelOnTop={props.labelOnTop}
        name={props.name}
        label={props.label}
        help={props.help}
        useLabel={props.useLabel}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div style={{ position: "relative" }} ref={dropdownRef}>
            {/* Main action button */}
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-primary maroon-button"
                onClick={handleMainButtonClick}
                style={{ cursor: props.disableChange ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                disabled={props.disableChange}
              >
                {currentLabel}
              </button>
              {showRemoteLabel && (
                <button
                  type="button"
                  className="btn btn-primary maroon-button dropdown-toggle dropdown-toggle-split"
                  onClick={() => setDropdownOpen((o) => !o)}
                  disabled={props.disableChange}
                >
                  <span className="sr-only">Toggle Dropdown</span>
                </button>
              )}
            </div>

            {/* Dropdown menu — styled like image 2: plain list, shadow, no Bootstrap box */}
            {showRemoteLabel && dropdownOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                zIndex: 1000,
                background: "#fff",
                minWidth: "180px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                borderRadius: "4px",
                padding: "4px 0",
                marginTop: "2px",
              }}>
                <button
                  type="button"
                  onClick={() => handleSelectMode("local")}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px", fontSize: "14px",
                    background: pickerMode === "local" ? "#f5f5f5" : "none",
                    border: "none", cursor: "pointer", color: "#333",
                  }}
                >
                  {props.localLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode("remote")}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px", fontSize: "14px",
                    background: pickerMode === "remote" ? "#f5f5f5" : "none",
                    border: "none", cursor: "pointer", color: "#333",
                  }}
                >
                  {props.remoteLabel}
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            style={{ display: "none" }}
            multiple
            ref={remoteInput}
            onChange={(e) => handleFileChange(e.target.files)}
          />

          <input
            type="text"
            name={props.name}
            id={props.id || props.name}
            value={value}
            className="form-control"
            onChange={handleValueChange}
            ref={inputRef}
            readOnly={props.disableChange}
          />
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
        <div className="modal-dialog modal-xl" role="document">
          <div className="modal-content">
            <div className="modal-header" style={{ position: "sticky", top: "0", zIndex: "3" }}>
              <h5 className="modal-title" id="exampleModalLabel">
                {props.label}
              </h5>
              <div className="file-picker-modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary file-picker-modal__btn"
                  data-dismiss="modal"
                >
                  <CloseIcon />
                  <span>Close</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary file-picker-modal__btn"
                  data-dismiss="modal"
                  onClick={handleSaveChange}
                >
                  <SaveIcon />
                  <span>Save changes</span>
                </button>
              </div>
            </div>
            <div className="modal-body p-0">
              <div className="file-picker-explorer">
                <aside className="file-picker-explorer__sidebar" aria-label="Suggested directories">
                  <div className="file-picker-explorer__sidebar-title">Suggested</div>
                  <nav className="file-picker-explorer__sidebar-nav">
                    {mainPaths.map(([label, fullPath]) => (
                      <button
                        key={fullPath}
                        type="button"
                        className={`file-picker-explorer__sidebar-item${
                          isSidebarPathActive(currentPath, fullPath)
                            ? " file-picker-explorer__sidebar-item--active"
                            : ""
                        }`}
                        onClick={() => handleSuggestedPathClick(fullPath)}
                      >
                        <span className="file-picker-explorer__icon file-picker-explorer__icon--folder" aria-hidden="true" />
                        <span className="file-picker-explorer__sidebar-label">{label}</span>
                      </button>
                    ))}
                  </nav>
                </aside>

                <div className="file-picker-explorer__main">
                  <div className="file-picker-explorer__toolbar">
                    <button
                      type="button"
                      className="file-picker-explorer__back-btn"
                      onClick={handleBackClick}
                      disabled={!currentPath}
                      aria-label="Go back"
                    >
                      <span className="file-picker-explorer__back-icon" aria-hidden="true">←</span>
                      <span className="file-picker-explorer__back-label">Back</span>
                    </button>
                    <div className="file-picker-explorer__breadcrumb" aria-label="Current path">
                      {breadcrumbs.length === 0 ? (
                        <span className="file-picker-explorer__breadcrumb-current">Select a folder</span>
                      ) : (
                        breadcrumbs.map((crumb, index) => (
                          <React.Fragment key={crumb.path}>
                            {index > 0 && (
                              <span className="file-picker-explorer__breadcrumb-separator" aria-hidden="true">
                                /
                              </span>
                            )}
                            <button
                              type="button"
                              className={`file-picker-explorer__breadcrumb-item${
                                index === breadcrumbs.length - 1
                                  ? " file-picker-explorer__breadcrumb-item--current"
                                  : ""
                              }`}
                              onClick={() => handleBreadcrumbClick(crumb.path)}
                              disabled={index === breadcrumbs.length - 1}
                            >
                              {crumb.label}
                              {index === breadcrumbs.length - 1 ? " /" : ""}
                            </button>
                          </React.Fragment>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="file-picker-explorer__list" role="listbox" aria-label="Files and folders">
                    {isListEmpty && currentPath && (
                      <div className="file-picker-explorer__empty">This folder is empty</div>
                    )}
                    {!currentPath && (
                      <div className="file-picker-explorer__empty">
                        Choose a suggested directory or use the toolbar to browse
                      </div>
                    )}
                    {subDirs.map(([name, fullPath]) => (
                      <button
                        key={fullPath}
                        type="button"
                        role="option"
                        className="file-picker-explorer__row file-picker-explorer__row--folder"
                        onClick={() => handleFolderClick(fullPath)}
                      >
                        <span className="file-picker-explorer__icon file-picker-explorer__icon--folder" aria-hidden="true" />
                        <span className="file-picker-explorer__row-name">{name}</span>
                      </button>
                    ))}
                    {isShowFiles &&
                      subFiles.map(([name, fullPath]) => (
                        <button
                          key={fullPath}
                          type="button"
                          role="option"
                          aria-selected={currentPath === fullPath}
                          className={`file-picker-explorer__row file-picker-explorer__row--file${
                            currentPath === fullPath ? " file-picker-explorer__row--selected" : ""
                          }`}
                          onClick={() => handleFileClick(fullPath)}
                        >
                          <span className="file-picker-explorer__icon file-picker-explorer__icon--file" aria-hidden="true" />
                          <span className="file-picker-explorer__row-name">{name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Picker;