const APPEARANCE_STORAGE_KEY = "drona_composer_appearance";
const COMPACT_META_STORAGE_KEY = "drona_composer_compact_show_meta";
const WARN_PREVIEW_SCRIPT_CHANGES_KEY = "drona_composer_warn_preview_script_changes";
const HIGH_CONTRAST_TOOLTIP_KEY = "drona_composer_high_contrast_tooltip";

export const APPEARANCE_CLASSIC = "classic";
export const APPEARANCE_MODERN = "modern";

export const PREFERENCES_CHANGED_EVENT = "drona-composer-preferences-changed";

function dispatchPreferencesChanged() {
  window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT));
}

export function readAppearance() {
  try {
    const value = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return value === APPEARANCE_MODERN ? APPEARANCE_MODERN : APPEARANCE_CLASSIC;
  } catch {
    return APPEARANCE_CLASSIC;
  }
}

export function saveAppearance(appearance) {
  const next =
    appearance === APPEARANCE_MODERN ? APPEARANCE_MODERN : APPEARANCE_CLASSIC;
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
  } catch {
    /* ignore quota/private mode */
  }
  dispatchPreferencesChanged();
  return next;
}

export function readCompactModeShowMeta() {
  try {
    const value = localStorage.getItem(COMPACT_META_STORAGE_KEY);
    if (value === null) {
      return true;
    }
    return value === "true";
  } catch {
    return true;
  }
}

export function saveCompactModeShowMeta(show) {
  const next = Boolean(show);
  try {
    localStorage.setItem(COMPACT_META_STORAGE_KEY, String(next));
  } catch {
    /* ignore quota/private mode */
  }
  dispatchPreferencesChanged();
  return next;
}

export function readWarnOnPreviewScriptChanges() {
  try {
    const value = localStorage.getItem(WARN_PREVIEW_SCRIPT_CHANGES_KEY);
    if (value === null) {
      return true;
    }
    return value === "true";
  } catch {
    return true;
  }
}

export function saveWarnOnPreviewScriptChanges(show) {
  const next = Boolean(show);
  try {
    localStorage.setItem(WARN_PREVIEW_SCRIPT_CHANGES_KEY, String(next));
  } catch {
    /* ignore quota/private mode */
  }
  dispatchPreferencesChanged();
  return next;
}

export function readHighContrastTooltip() {
  try {
    const value = localStorage.getItem(HIGH_CONTRAST_TOOLTIP_KEY);
    if (value === null) {
      return false;
    }
    return value === "true";
  } catch {
    return false;
  }
}

export function saveHighContrastTooltip(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem(HIGH_CONTRAST_TOOLTIP_KEY, String(next));
  } catch {
    /* ignore quota/private mode */
  }
  dispatchPreferencesChanged();
  return next;
}
