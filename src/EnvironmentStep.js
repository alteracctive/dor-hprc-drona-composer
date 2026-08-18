import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import {
  PREFERENCES_CHANGED_EVENT,
  readCompactModeShowMeta,
} from "./userPreferences";

const COMPACT_MODE_STORAGE_KEY = "drona_composer_environment_compact_mode";

function readCompactModePreference() {
  try {
    return localStorage.getItem(COMPACT_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function EnvironmentNameCell({ name, textStyle }) {
  return (
    <span className="env-table__env-cell" style={textStyle}>
      <span className="env-table__env-name">{name}</span>
    </span>
  );
}

function ReadyButton({ onClick }) {
  return (
    <button type="button" className="btn btn-success btn-sm env-ready-btn" onClick={onClick}>
      <span className="env-ready-tick" aria-hidden="true">✓</span>
      Ready
    </button>
  );
}

function TrashIcon() {
  return (
    <svg
      className="env-remove-btn__icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="env-import-btn__icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  );
}

function ThreeDotsIcon() {
  return (
    <svg
      className="env-dropdown-toggle__icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

function RemoveButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="btn btn-sm env-remove-btn"
      onClick={onClick}
      disabled={disabled}
    >
      <TrashIcon />
      Remove
    </button>
  );
}

function EnvironmentActions({ isCompactMode, onReady, onRemove, showRemove = false }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const groupClass = isCompactMode ? "env-action-group--compact" : "env-action-group--detail";

  return (
    <div className={`env-action-group ${groupClass}`}>
      <ReadyButton onClick={onReady} />
      {showRemove && onRemove && (
        <div className="env-dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            className={`btn btn-sm env-dropdown-toggle ${isDropdownOpen ? "active" : ""}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            title="Options"
          >
            <ThreeDotsIcon />
          </button>
          {isDropdownOpen && (
            <div className="env-dropdown-menu">
              <button
                type="button"
                className="env-dropdown-item env-dropdown-item--danger"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onRemove();
                }}
              >
                <TrashIcon />
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModalPortal({ children }) {
  const el = useMemo(() => document.createElement("div"), []);

  useEffect(() => {
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);

  return ReactDOM.createPortal(children, el);
}

function RemoveEnvironmentModal({ envName, isRemoving, onConfirm, onCancel }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isRemoving) {
      onCancel();
    }
  };

  return (
    <ModalPortal>
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
              <h5 className="modal-title">Remove Environment</h5>
              <button
                type="button"
                className="close"
                onClick={onCancel}
                disabled={isRemoving}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-0">
                Are you sure you want to remove <strong>{envName}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn env-remove-btn"
                onClick={onConfirm}
                disabled={isRemoving}
              >
                {isRemoving ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ImportEnvironmentButton({ env, isImported, isCompactMode, onImport, onReady, onRemove }) {
  const [isImporting, setIsImporting] = useState(false);
  const [justImported, setJustImported] = useState(false);
  const ready = isImported || justImported;

  useEffect(() => {
    if (!isImported) {
      setJustImported(false);
    }
  }, [isImported]);

  const handleImport = () => {
    setIsImporting(true);
    onImport(env)
      .then((result) => {
        setIsImporting(false);
        if (result.success) {
          setJustImported(true);
        } else {
          alert("Error importing environment: " + (result.details || result.message));
        }
      })
      .catch((error) => {
        setIsImporting(false);
        console.error("Error importing environment:", error);
        alert("Error importing environment. See console for details.");
      });
  };

  if (ready) {
    return (
      <EnvironmentActions
        isCompactMode={isCompactMode}
        onReady={() => onReady(env)}
        onRemove={onRemove ? () => onRemove(env) : null}
        showRemove
      />
    );
  }
  if (isImporting) {
    return (
      <button type="button" className="btn btn-primary btn-sm" disabled>
        <span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true" />
        Importing...
      </button>
    );
  }
  return (
    <button type="button" className="btn btn-primary btn-sm maroon-button env-import-btn" onClick={handleImport}>
      <DownloadIcon />
      Import
    </button>
  );
}

function SortableTh({ column, label, sortColumn, sortDirection, onSort, className = "" }) {
  const isActive = sortColumn === column;
  const indicator = isActive ? (sortDirection === "asc" ? "▲" : "▼") : null;
  return (
    <th
      className={`env-table__sortable-th ${className}`.trim()}
      onClick={() => onSort(column)}
      aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="env-table__sortable-content">
        <span className="env-table__sortable-label">{label}</span>
        {indicator && (
          <span className="env-table__sort-indicator" aria-hidden="true">
            {indicator}
          </span>
        )}
      </span>
    </th>
  );
}

function sortRows(rows, sortColumn, sortDirection) {
  if (!sortColumn) return rows;
  return [...rows].sort((a, b) => {
    const aVal = (a[sortColumn] || "N/A").toString().toLowerCase();
    const bVal = (b[sortColumn] || "N/A").toString().toLowerCase();
    const cmp = aVal.localeCompare(bVal);
    return sortDirection === "asc" ? cmp : -cmp;
  });
}

function DetailModeIcon() {
  return (
    <svg className="environment-step__mode-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 4h12v1.5H2V4zm0 3.25h12v1.5H2V7.25zm0 3.25h12V12H2v-1.5z"
      />
    </svg>
  );
}

function CompactModeIcon() {
  return (
    <svg className="environment-step__mode-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"
      />
    </svg>
  );
}

function EnvironmentTable({ rows, sortColumn, sortDirection, onSort, renderAction, getRowKey, getEnvName, getEnvStyle }) {
  const sortedRows = useMemo(
    () => sortRows(rows, sortColumn, sortDirection),
    [rows, sortColumn, sortDirection]
  );

  return (
    <div className="environment-step__table-wrap">
      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <SortableTh
              column="env"
              label="Environment"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              className="env-table__col-env"
            />
            <th className="env-table__col-description">Description</th>
            <SortableTh
              column="category"
              label="Category"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              className="env-table__col-category"
            />
            <SortableTh
              column="organization"
              label="Organization"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              className="env-table__col-organization"
            />
            <th className="env-table__col-version">Version</th>
            <th className="env-table__col-action">Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={getRowKey(row)}>
              <td className="env-table__col-env" data-label="Environment">
                <EnvironmentNameCell
                  name={getEnvName(row)}
                  textStyle={getEnvStyle ? getEnvStyle(row) : undefined}
                />
              </td>
              <td className="env-table__col-description" data-label="Description">{row.description || "N/A"}</td>
              <td className="env-table__col-category" data-label="Category">{row.category || "N/A"}</td>
              <td className="env-table__col-organization" data-label="Organization">{row.organization || "N/A"}</td>
              <td className="env-table__col-version" data-label="Version">{row.version || "N/A"}</td>
              <td className="env-table__col-action" data-label="Action">{renderAction(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnvironmentCompactGrid({
  rows,
  sortColumn,
  sortDirection,
  renderAction,
  getRowKey,
  getEnvName,
  getEnvStyle,
  showMeta,
}) {
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const nameA = (getEnvName(a) || "").toString().toLowerCase();
      const nameB = (getEnvName(b) || "").toString().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [rows, getEnvName]);

  return (
    <div className="env-compact-grid">
      {sortedRows.map((row) => (
        <article key={getRowKey(row)} className="env-compact-card">
          <div className="env-compact-card__title-row">
            <div className="env-compact-card__name">
              <EnvironmentNameCell
                name={getEnvName(row)}
                textStyle={getEnvStyle ? getEnvStyle(row) : undefined}
              />
            </div>
            <span className="env-compact-card__version">{row.version || "N/A"}</span>
          </div>
          {showMeta && (
            <div className="env-compact-card__meta-row">
              <span className="env-compact-card__category">{row.category || "N/A"}</span>
              <span className="env-compact-card__organization">{row.organization || "N/A"}</span>
            </div>
          )}
          <div className="env-compact-card__action">{renderAction(row)}</div>
        </article>
      ))}
    </div>
  );
}

function EnvironmentStep({ environments, onSelectEnvironment, onImportEnvironment, onRemoveEnvironment }) {
  const [repoEnvironments, setRepoEnvironments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [isCompactMode, setIsCompactMode] = useState(readCompactModePreference);
  const [showCompactMeta, setShowCompactMeta] = useState(readCompactModeShowMeta);
  const [pendingRemoveEnv, setPendingRemoveEnv] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const toggleCompactMode = () => {
    setIsCompactMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COMPACT_MODE_STORAGE_KEY, String(next));
      } catch {
        /* ignore quota/private mode */
      }
      return next;
    });
  };

  const importedNames = new Set(environments.map((e) => e.value));
  const isImported = (envName) => importedNames.has(envName);

  const metadataByName = useMemo(
    () => Object.fromEntries(repoEnvironments.map((e) => [e.env, e])),
    [repoEnvironments]
  );

  const availableRows = useMemo(
    () =>
      environments.map((env) => ({
        ...env,
        env: env.value,
        description: metadataByName[env.value]?.description ?? "N/A",
        category: metadataByName[env.value]?.category ?? "N/A",
        organization: metadataByName[env.value]?.organization ?? "N/A",
        version: metadataByName[env.value]?.version ?? "N/A",
        icon_url: metadataByName[env.value]?.icon_url,
        icon: env.icon,
      })),
    [environments, metadataByName]
  );

  const filteredImportRows = useMemo(() => {
    return repoEnvironments.filter((env) => {
      const matchesSearch =
        (env.env || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (env.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "" || env.category === categoryFilter;
      const matchesOrganization = organizationFilter === "" || env.organization === organizationFilter;
      return matchesSearch && matchesCategory && matchesOrganization;
    });
  }, [searchTerm, categoryFilter, organizationFilter, repoEnvironments]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleReady = (env) => {
    const available = environments.find((e) => e.value === env.env);
    onSelectEnvironment({
      value: env.env,
      label: env.env,
      src: available ? available.src : env.src,
    });
  };

  const handleAvailableReady = (env) => {
    onSelectEnvironment({ value: env.value, label: env.label, src: env.src });
  };

  const openRemoveModal = (env) => {
    setPendingRemoveEnv(env);
  };

  const closeRemoveModal = () => {
    if (!isRemoving) {
      setPendingRemoveEnv(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!pendingRemoveEnv || !onRemoveEnvironment) return;

    const name =
      pendingRemoveEnv.value || pendingRemoveEnv.env || pendingRemoveEnv.label;

    setIsRemoving(true);
    try {
      const response = await fetch(
        `${document.dashboard_url}/jobs/composer/environment`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ env: name }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.status !== "Success") {
        const detail =
          data.message || data.details?.error || "Failed to remove environment";
        throw new Error(detail);
      }
      onRemoveEnvironment(pendingRemoveEnv);
      setPendingRemoveEnv(null);
    } catch (error) {
      console.error("Error removing environment:", error);
      alert(`Error removing environment: ${error.message}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleImport = (env) => {
    const formData = new FormData();
    formData.append("env", env.env);
    formData.append("src", env.src);
    return fetch(document.dashboard_url + "/jobs/composer/add_environment", { method: "POST", body: formData })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "Success") {
          onImportEnvironment({
            value: env.env,
            label: env.env,
            src: env.src,
            isUserEnv: true,
            styles: { color: "#3B71CA" },
          });
          return { success: true };
        }
        return {
          success: false,
          message: data.message || "Failed to import environment",
          details: JSON.stringify(data.details || data, null, 2),
        };
      })
      .catch((error) => ({
        success: false,
        message: error.message || "Unknown error occurred",
        details: "Unknown Error",
      }));
  };

  useEffect(() => {
    setIsLoading(true);
    fetch(document.dashboard_url + "/jobs/composer/get_more_envs_info")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) { setIsLoading(false); return; }
        setRepoEnvironments(data);
        setCategories([...new Set(data.map((env) => env.category).filter(Boolean))]);
        setOrganizations([...new Set(data.map((env) => env.organization).filter(Boolean))]);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching environment data:", error);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const handlePreferencesChanged = () => {
      setShowCompactMeta(readCompactModeShowMeta());
    };

    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    return () => {
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
    };
  }, []);

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
    setOrganizationFilter("");
  };

  const isFilterActive =
    searchTerm.trim() !== "" || categoryFilter !== "" || organizationFilter !== "";

  const EnvironmentList = isCompactMode ? EnvironmentCompactGrid : EnvironmentTable;

  const importListProps = {
    sortColumn,
    sortDirection,
    onSort: handleSort,
    getRowKey: (row) => row.env,
    getEnvName: (row) => row.env,
    showMeta: showCompactMeta,
    renderAction: (row) => (
      <ImportEnvironmentButton
        env={row}
        isImported={isImported(row.env)}
        isCompactMode={isCompactMode}
        onImport={handleImport}
        onReady={handleReady}
        onRemove={openRemoveModal}
      />
    ),
  };

  const renderImportCatalog = (rows, showCount) => {
    if (isLoading) {
      return (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2">Loading environments...</p>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="alert alert-info mb-0">
          {isFilterActive ? (
            <>
              No environments found matching your filters.
              <button type="button" className="btn btn-link" onClick={resetFilters}>
                Reset filters
              </button>
            </>
          ) : (
            "No environments found in the repository."
          )}
        </div>
      );
    }

    return (
      <>
        <EnvironmentList rows={rows} {...importListProps} />
        {showCount && (
          <div className="mt-2 text-muted small">
            Showing {rows.length} of {repoEnvironments.length} environments
          </div>
        )}
      </>
    );
  };

  return (
    <div className="environment-step">
      <div className="environment-step__filters row align-items-center no-gutters">
        <div className="col-md-5 col-12 mb-2 mb-md-0 environment-step__filter-field">
          <label htmlFor="environment-search" className="sr-only">
            Search environments
          </label>
          <input
            type="text"
            id="environment-search"
            className="form-control environment-step__filter-control"
            placeholder="Search environments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-auto col-6 mb-2 mb-md-0 environment-step__filter-field environment-step__filter-field--select">
          <label htmlFor="environment-category-filter" className="sr-only">
            Filter by category
          </label>
          <select
            id="environment-category-filter"
            className="form-control environment-step__filter-control environment-step__filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-auto col-6 mb-2 mb-md-0 environment-step__filter-field environment-step__filter-field--select">
          <label htmlFor="environment-organization-filter" className="sr-only">
            Filter by organization
          </label>
          <select
            id="environment-organization-filter"
            className="form-control environment-step__filter-control environment-step__filter-select"
            value={organizationFilter}
            onChange={(e) => setOrganizationFilter(e.target.value)}
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-auto col-12 mb-2 mb-md-0 environment-step__filter-field">
          <button
            type="button"
            className="btn btn-outline-secondary environment-step__filter-clear"
            onClick={resetFilters}
            disabled={!isFilterActive}
          >
            Clear search
          </button>
        </div>
        <div className="col-md-auto col-12 ml-md-auto">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm environment-step__mode-toggle"
            onClick={toggleCompactMode}
            aria-pressed={isCompactMode}
          >
            {isCompactMode ? <CompactModeIcon /> : <DetailModeIcon />}
            {isCompactMode ? "Compact Mode" : "Detail Mode"}
          </button>
        </div>
      </div>

      {!isFilterActive && (
        <section className="environment-step__section">
          <h5 className="environment-step__heading">Available</h5>
          <p className="text-muted small mb-3">
            System and imported environments ready to use. Click &quot;Ready&quot; to use the environment
          </p>
          {environments.length === 0 ? (
            <div className="alert alert-info mb-0">
              No environments available yet. Import one from the repository below.
            </div>
          ) : (
            <EnvironmentList
              rows={availableRows}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              showMeta={showCompactMeta}
              getRowKey={(row) => `${row.value}-${row.src}`}
              getEnvName={(row) => row.label}
              getEnvStyle={(row) => row.styles}
              renderAction={(row) => {
                const isUserEnv = row.isUserEnv ?? row.is_user_env;
                if (!isUserEnv) {
                  return <ReadyButton onClick={() => handleAvailableReady(row)} />;
                }
                return (
                  <EnvironmentActions
                    isCompactMode={isCompactMode}
                    onReady={() => handleAvailableReady(row)}
                    onRemove={() => openRemoveModal(row)}
                    showRemove
                  />
                );
              }}
            />
          )}
        </section>
      )}

      {!isFilterActive ? (
        <section className="environment-step__section">
          <h5 className="environment-step__heading">Import from Repository</h5>
          {renderImportCatalog(repoEnvironments, true)}
        </section>
      ) : (
        <section className="environment-step__section environment-step__section--filter-mode">
          {renderImportCatalog(filteredImportRows, false)}
        </section>
      )}
      {pendingRemoveEnv && (
        <RemoveEnvironmentModal
          envName={
            pendingRemoveEnv.value ||
            pendingRemoveEnv.env ||
            pendingRemoveEnv.label
          }
          isRemoving={isRemoving}
          onConfirm={handleRemoveConfirm}
          onCancel={closeRemoveModal}
        />
      )}
    </div>
  );
}

export default EnvironmentStep;
