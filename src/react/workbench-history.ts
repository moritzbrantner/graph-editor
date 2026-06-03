export type GraphWorkbenchHistoryState<TDocument> = {
  past: TDocument[];
  present: TDocument;
  future: TDocument[];
  canUndo: boolean;
  canRedo: boolean;
};

export const defaultGraphWorkbenchMaxHistory = 100;

export function createGraphWorkbenchHistory<TDocument>(
  document: TDocument,
): GraphWorkbenchHistoryState<TDocument> {
  return withGraphWorkbenchHistoryFlags({
    past: [],
    present: document,
    future: [],
  });
}

export function pushGraphWorkbenchHistory<TDocument>(
  history: GraphWorkbenchHistoryState<TDocument>,
  document: TDocument,
  options: { maxHistory?: number; equals?: (left: TDocument, right: TDocument) => boolean } = {},
): GraphWorkbenchHistoryState<TDocument> {
  const equals = options.equals ?? Object.is;

  if (equals(history.present, document)) {
    return history;
  }

  const maxHistory = Math.max(0, Math.trunc(options.maxHistory ?? defaultGraphWorkbenchMaxHistory));
  const past = maxHistory === 0 ? [] : [...history.past, history.present].slice(-maxHistory);

  return withGraphWorkbenchHistoryFlags({
    past,
    present: document,
    future: [],
  });
}

export function undoGraphWorkbenchHistory<TDocument>(
  history: GraphWorkbenchHistoryState<TDocument>,
): GraphWorkbenchHistoryState<TDocument> {
  const previous = history.past.at(-1);

  if (!previous) {
    return history;
  }

  return withGraphWorkbenchHistoryFlags({
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  });
}

export function redoGraphWorkbenchHistory<TDocument>(
  history: GraphWorkbenchHistoryState<TDocument>,
): GraphWorkbenchHistoryState<TDocument> {
  const next = history.future.at(0);

  if (!next) {
    return history;
  }

  return withGraphWorkbenchHistoryFlags({
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  });
}

function withGraphWorkbenchHistoryFlags<TDocument>(history: {
  past: TDocument[];
  present: TDocument;
  future: TDocument[];
}): GraphWorkbenchHistoryState<TDocument> {
  return {
    ...history,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
