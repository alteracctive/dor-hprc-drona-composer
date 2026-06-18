export function arePreviewPanesDirty(currentPanes, snapshot) {
  if (!snapshot || snapshot.length === 0) {
    return false;
  }

  const current = Array.isArray(currentPanes) ? currentPanes : [];
  const snapshotByName = new Map(snapshot.map((pane) => [pane.name, pane.content ?? ""]));
  const currentByName = new Map(current.map((pane) => [pane.name, pane.content ?? ""]));

  if (currentByName.size !== snapshotByName.size) {
    return true;
  }

  for (const [name, originalContent] of snapshotByName) {
    if (!currentByName.has(name)) {
      return true;
    }
    if (currentByName.get(name) !== originalContent) {
      return true;
    }
  }

  return false;
}
