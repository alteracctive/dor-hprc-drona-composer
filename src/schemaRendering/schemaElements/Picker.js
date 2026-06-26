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

function formatSize(bytes, isDir) {
  if (isDir) return "—";
  if (bytes === null || bytes === undefined) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatMtime(mtimeSecs) {
  if (!mtimeSecs) return "—";
  const date = new Date(mtimeSecs * 1000);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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

  const [sortField, setSortField] = useState("name"); // "name", "size", "mtime"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc", "desc"

  const [editingPath, setEditingPath] = useState(false);
  const [editSegments, setEditSegments] = useState([]);
  const [activeEditIndex, setActiveEditIndex] = useState(null);
  const [segmentValidity, setSegmentValidity] = useState([]);
  const [isPathInvalid, setIsPathInvalid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const segmentRefs = useRef([]);
  const breadcrumbRef = useRef(null);
  const [doubleClickOffset, setDoubleClickOffset] = useState(null);
  const clickTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const startEditing = (focusedIndex = null, offset = null) => {
    let segs = currentPath.split("/").filter(Boolean);
    if (segs.length === 0) {
      segs = [""];
    }
    setEditSegments(segs);
    setEditingPath(true);
    setSegmentValidity([]);
    setIsPathInvalid(false);

    const targetIndex = focusedIndex !== null ? focusedIndex : segs.length - 1;
    setActiveEditIndex(targetIndex);

    if (focusedIndex === null) {
      const lastSeg = segs[targetIndex] || "";
      setDoubleClickOffset(lastSeg.length);
    } else {
      setDoubleClickOffset(offset);
    }
  };

  const handleCrumbClick = (e, crumb, index) => {
    e.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;

      const selection = window.getSelection();
      let offset = null;
      if (selection && selection.anchorNode) {
        offset = selection.anchorOffset;
      }
      startEditing(index, offset);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        loadDirectory(crumb.path);
      }, 250);
    }
  };

  useEffect(() => {
    if (editingPath && activeEditIndex !== null && segmentRefs.current[activeEditIndex]) {
      const el = segmentRefs.current[activeEditIndex];
      el.focus();
      if (doubleClickOffset !== null) {
        el.setSelectionRange(doubleClickOffset, doubleClickOffset);
        setDoubleClickOffset(null);
      } else {
        el.select();
      }
    }
  }, [editingPath, activeEditIndex, editSegments.length, doubleClickOffset]);

  const triggerPathValidation = () => {
    const pathToCheck = "/" + editSegments.filter(Boolean).join("/");
    setIsValidating(true);

    return fetch(
      document.dashboard_url +
      "/jobs/composer/validate_path?path=" +
      encodeURIComponent(pathToCheck)
    )
      .then((res) => res.json())
      .then((data) => {
        setIsValidating(false);
        if (data.valid) {
          setSegmentValidity([]);
          setIsPathInvalid(false);
          loadDirectory(pathToCheck);
          setEditingPath(false);
          return true;
        } else {
          setSegmentValidity(data.validity || []);
          setIsPathInvalid(true);
          return false;
        }
      })
      .catch(() => {
        setIsValidating(false);
        setIsPathInvalid(true);
        return false;
      });
  };

  const handleContainerBlur = (e) => {
    if (breadcrumbRef.current && breadcrumbRef.current.contains(e.relatedTarget)) {
      return;
    }
    triggerPathValidation();
  };

  const handleBreadcrumbCopy = (e) => {
    const selection = window.getSelection().toString();
    if (!selection) {
      e.preventDefault();
      const fullPath = "/" + editSegments.filter(Boolean).join("/");
      e.clipboardData.setData("text/plain", fullPath);
    }
  };

  const handleSegmentKeyDown = (index, e) => {
    if (e.key === "/" || e.key === "Enter") {
      e.preventDefault();
      if (e.key === "/") {
        if (index === editSegments.length - 1) {
          setEditSegments([...editSegments, ""]);
          setActiveEditIndex(index + 1);
        } else {
          setActiveEditIndex(index + 1);
        }
      } else if (e.key === "Enter") {
        triggerPathValidation();
      }
    } else if (e.key === "Backspace" && editSegments[index] === "") {
      e.preventDefault();
      if (index > 0) {
        const newSegments = [...editSegments];
        newSegments.splice(index, 1);
        setEditSegments(newSegments);
        setActiveEditIndex(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      if (e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
        if (index > 0) {
          e.preventDefault();
          setActiveEditIndex(index - 1);
        }
      }
    } else if (e.key === "ArrowRight") {
      if (e.target.selectionStart === e.target.value.length && e.target.selectionEnd === e.target.value.length) {
        if (index < editSegments.length - 1) {
          e.preventDefault();
          setActiveEditIndex(index + 1);
        }
      }
    }
  };

  const handleSegmentChange = (index, val) => {
    if (val.includes("/")) {
      const parts = val.split("/");
      const newSegments = [...editSegments];
      newSegments.splice(index, 1, ...parts.filter(Boolean));
      setEditSegments(newSegments);
      setActiveEditIndex(index + parts.filter(Boolean).length - 1);
      return;
    }

    const newSegments = [...editSegments];
    newSegments[index] = val;
    setEditSegments(newSegments);
  };

  const handleSegmentPaste = (index, e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    if (pastedText) {
      const parts = pastedText.replace(/\\/g, "/").split("/").filter(Boolean);
      if (pastedText.startsWith("/")) {
        setEditSegments(parts);
        setActiveEditIndex(parts.length - 1);
      } else {
        const newSegments = [...editSegments];
        newSegments.splice(index, 1, ...parts);
        setEditSegments(newSegments);
        setActiveEditIndex(index + parts.length - 1);
      }
    }
  };

  const handleSaveClick = () => {
    if (editingPath) {
      triggerPathValidation().then((isValid) => {
        if (isValid) {
          handleSaveChange();
          const modalEl = document.getElementById("local-file-picker-modal-" + props.name);
          if (modalEl && window.$) window.$(modalEl).modal("hide");
        }
      });
    } else {
      if (!isPathInvalid) {
        handleSaveChange();
        const modalEl = document.getElementById("local-file-picker-modal-" + props.name);
        if (modalEl && window.$) window.$(modalEl).modal("hide");
      }
    }
  };

  const sortedSubDirs = useMemo(() => {
    const sorted = [...subDirs];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "name") {
        valA = (valA || "").toLowerCase();
        valB = (valB || "").toLowerCase();
      } else {
        valA = valA ?? 0;
        valB = valB ?? 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [subDirs, sortField, sortOrder]);

  const sortedSubFiles = useMemo(() => {
    const sorted = [...subFiles];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "name") {
        valA = (valA || "").toLowerCase();
        valB = (valB || "").toLowerCase();
      } else {
        valA = valA ?? 0;
        valB = valB ?? 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [subFiles, sortField, sortOrder]);

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

  const loadDirectory = useCallback((fullPath) => {
    setCurrentPath(fullPath);
    setEditingPath(false);
    setIsPathInvalid(false);
    setSegmentValidity([]);

    if (!fullPath) {
      setSubDirs([]);
      setSubFiles([]);
      return Promise.resolve();
    }

    return fetch(
      document.dashboard_url +
      "/jobs/composer/subdirectories?details=true&path=" +
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
        const subdirs = data.subdirectories.map((item) => ({
          name: typeof item === "object" ? item.name : item,
          fullPath: fullPath + "/" + (typeof item === "object" ? item.name : item),
          size: typeof item === "object" ? item.size : null,
          mtime: typeof item === "object" ? item.mtime : null,
          isDir: true,
        }));
        const subfiles = data.subfiles.map((item) => ({
          name: typeof item === "object" ? item.name : item,
          fullPath: fullPath + "/" + (typeof item === "object" ? item.name : item),
          size: typeof item === "object" ? item.size : null,
          mtime: typeof item === "object" ? item.mtime : null,
          isDir: false,
        }));
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
    setEditingPath(false);
    setIsPathInvalid(false);
    setSegmentValidity([]);
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

  function handleRemoteClick() {
    if (remoteInput.current) {
      remoteInput.current.value = "";
    }
    remoteInput.current.click();
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
      setEditingPath(false);
      setIsPathInvalid(false);
      setSegmentValidity([]);
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
                  onClick={handleSaveClick}
                  disabled={isPathInvalid}
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
                    <div
                      ref={breadcrumbRef}
                      className="file-picker-explorer__breadcrumb"
                      aria-label="Current path"
                      onClick={(e) => {
                        if (!editingPath) {
                          startEditing();
                        } else if (e.target.tagName !== "INPUT") {
                          const lastIndex = editSegments.length - 1;
                          setActiveEditIndex(lastIndex);
                          const lastSeg = editSegments[lastIndex] || "";
                          setDoubleClickOffset(lastSeg.length);
                        }
                      }}
                      onBlur={handleContainerBlur}
                      onCopy={handleBreadcrumbCopy}
                      style={{ outline: "none", cursor: editingPath ? "text" : "pointer" }}
                      tabIndex={0}
                    >
                      {!editingPath ? (
                        breadcrumbs.length === 0 ? (
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
                                onClick={(e) => handleCrumbClick(e, crumb, index)}
                              >
                                {crumb.label}
                                {index === breadcrumbs.length - 1 ? " /" : ""}
                              </button>
                            </React.Fragment>
                          ))
                        )
                      ) : (
                        <React.Fragment>
                          <span className="file-picker-explorer__breadcrumb-separator">/</span>
                          {editSegments.map((segment, index) => {
                            const isInvalid = segmentValidity[index] === false;
                            return (
                              <React.Fragment key={index}>
                                {index > 0 && (
                                  <span className="file-picker-explorer__breadcrumb-separator">/</span>
                                )}
                                <input
                                  type="text"
                                  ref={(el) => (segmentRefs.current[index] = el)}
                                  className={`file-picker-explorer__breadcrumb-input${isInvalid ? " invalid" : ""}`}
                                  value={segment}
                                  onChange={(e) => handleSegmentChange(index, e.target.value)}
                                  onKeyDown={(e) => handleSegmentKeyDown(index, e)}
                                  onPaste={(e) => handleSegmentPaste(index, e)}
                                  style={{
                                    width: `${Math.max(segment.length, 1) + 2}ch`,
                                  }}
                                />
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      )}
                    </div>
                  </div>

                  <div className="file-picker-explorer__header">
                    <button
                      type="button"
                      className="file-picker-explorer__header-cell file-picker-explorer__header-cell--name"
                      onClick={() => handleSort("name")}
                    >
                      Name {sortField === "name" && (sortOrder === "asc" ? " ▴" : " ▾")}
                    </button>
                    <button
                      type="button"
                      className="file-picker-explorer__header-cell file-picker-explorer__header-cell--size"
                      onClick={() => handleSort("size")}
                    >
                      Size {sortField === "size" && (sortOrder === "asc" ? " ▴" : " ▾")}
                    </button>
                    <button
                      type="button"
                      className="file-picker-explorer__header-cell file-picker-explorer__header-cell--mtime"
                      onClick={() => handleSort("mtime")}
                    >
                      Date Modified {sortField === "mtime" && (sortOrder === "asc" ? " ▴" : " ▾")}
                    </button>
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
                    {sortedSubDirs.map((item) => (
                      <button
                        key={item.fullPath}
                        type="button"
                        role="option"
                        className="file-picker-explorer__row file-picker-explorer__row--folder"
                        onClick={() => handleFolderClick(item.fullPath)}
                      >
                        <div className="file-picker-explorer__cell file-picker-explorer__cell--name">
                          <span className="file-picker-explorer__icon file-picker-explorer__icon--folder" aria-hidden="true" />
                          <span className="file-picker-explorer__row-name">{item.name}</span>
                        </div>
                        <div className="file-picker-explorer__cell file-picker-explorer__cell--size">
                          {formatSize(item.size, true)}
                        </div>
                        <div className="file-picker-explorer__cell file-picker-explorer__cell--mtime">
                          {formatMtime(item.mtime)}
                        </div>
                      </button>
                    ))}
                    {isShowFiles &&
                      sortedSubFiles.map((item) => (
                        <button
                          key={item.fullPath}
                          type="button"
                          role="option"
                          aria-selected={currentPath === item.fullPath}
                          className={`file-picker-explorer__row file-picker-explorer__row--file${
                            currentPath === item.fullPath ? " file-picker-explorer__row--selected" : ""
                          }`}
                          onClick={() => handleFileClick(item.fullPath)}
                        >
                          <div className="file-picker-explorer__cell file-picker-explorer__cell--name">
                            <span className="file-picker-explorer__icon file-picker-explorer__icon--file" aria-hidden="true" />
                            <span className="file-picker-explorer__row-name">{item.name}</span>
                          </div>
                          <div className="file-picker-explorer__cell file-picker-explorer__cell--size">
                            {formatSize(item.size, false)}
                          </div>
                          <div className="file-picker-explorer__cell file-picker-explorer__cell--mtime">
                            {formatMtime(item.mtime)}
                          </div>
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