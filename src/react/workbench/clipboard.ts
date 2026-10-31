"use client";

import * as React from "react";

import {
  readEditorClipboardJson,
  writeEditorClipboardJson,
  type EditorClipboardFallback,
} from "@moenarch/editor-core/browser";
import {
  copyGraphEditorSelection,
  graphEditorClipboardFormat,
  type GraphEditorClipboardPayload,
  type GraphEditorDocument,
  type GraphEditorSelectionState,
} from "../../core";
import { createGraphEditorPasteOperation } from "../../operations";
import { selectionFromPasteResult } from "./document-helpers";
import {
  type GraphWorkbenchActionErrorCode,
  type GraphWorkbenchController,
  type GraphWorkbenchProps,
} from "./types";

export function useGraphWorkbenchClipboard<TNodeData, TEdgeData, TPortType>({
  document,
  selection,
  readOnly,
  copySelection: customCopySelection,
  pasteClipboardPayload,
  commitDocument,
  dispatch,
  clearActionError,
  reportActionError,
}: Pick<
  GraphWorkbenchProps<TNodeData, TEdgeData, TPortType>,
  "copySelection" | "pasteClipboardPayload"
> & {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  selection: GraphEditorSelectionState;
  readOnly: boolean;
  commitDocument: GraphWorkbenchController<
    TNodeData,
    TEdgeData,
    TPortType
  >["actions"]["updateDocument"];
  dispatch: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>["dispatch"];
  clearActionError: () => void;
  reportActionError: (
    code: GraphWorkbenchActionErrorCode,
    error: unknown,
    fallbackMessage: string,
  ) => void;
}) {
  const [clipboardPayload, setClipboardPayload] = React.useState<unknown>(null);
  const clipboardPayloadRef = React.useRef<unknown>(null);
  const clipboardTextFallbackRef = React.useRef<EditorClipboardFallback>({});

  const copySelection = React.useCallback(async () => {
    try {
      const payload =
        customCopySelection?.(document, selection) ??
        copyGraphEditorSelection<TNodeData, TEdgeData, TPortType>(document, selection);
      clipboardPayloadRef.current = payload;
      setClipboardPayload(payload);

      if (
        isGraphWorkbenchEmptyClipboardPayload(payload) ||
        (typeof payload !== "object" && payload !== null)
      ) {
        clearActionError();
        return;
      }

      try {
        const copied = await writeEditorClipboardJson(payload, {
          fallback: clipboardTextFallbackRef.current,
        });
        if (copied) {
          clearActionError();
        } else {
          reportActionError("copy-selection", "Clipboard write used fallback", "Copy failed");
        }
      } catch (error) {
        reportActionError("copy-selection", error, "Copy failed");
      }
    } catch (error) {
      reportActionError("copy-selection", error, "Copy failed");
    }
  }, [clearActionError, customCopySelection, document, reportActionError, selection]);

  const readClipboardPayload = React.useCallback(async () => {
    const payload = await readEditorClipboardJson({
      fallback: clipboardTextFallbackRef.current,
    });
    if (isGraphWorkbenchReadableClipboardPayload(payload, Boolean(pasteClipboardPayload))) {
      return payload;
    }

    return clipboardPayloadRef.current ?? clipboardPayload;
  }, [clipboardPayload, pasteClipboardPayload]);

  const pasteSelection = React.useCallback(async () => {
    if (readOnly) {
      return;
    }

    try {
      const payload = await readClipboardPayload();
      if (!payload) {
        reportActionError("paste-selection", null, "Paste failed");
        return;
      }

      if (pasteClipboardPayload) {
        const result = pasteClipboardPayload(document, payload);
        commitDocument(result.document, {
          selectionAfter: selectionFromPasteResult(result),
        });
        clearActionError();
        return;
      }

      dispatch(
        createGraphEditorPasteOperation(
          payload as GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>,
          { selectionBefore: selection },
        ),
      );
      clearActionError();
    } catch (error) {
      reportActionError("paste-selection", error, "Paste failed");
    }
  }, [
    clearActionError,
    commitDocument,
    dispatch,
    document,
    pasteClipboardPayload,
    readClipboardPayload,
    readOnly,
    reportActionError,
    selection,
  ]);

  return { clipboardPayload, copySelection, pasteSelection };
}

function isGraphWorkbenchEmptyClipboardPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return true;
  }

  const candidate = payload as { nodes?: unknown[]; edges?: unknown[]; groups?: unknown[] };
  return (
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges) &&
    candidate.nodes.length === 0 &&
    candidate.edges.length === 0 &&
    (!Array.isArray(candidate.groups) || candidate.groups.length === 0)
  );
}

function isGraphWorkbenchReadableClipboardPayload(payload: unknown, acceptsCustomPayload: boolean) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return (
    (payload as { format?: unknown }).format === graphEditorClipboardFormat || acceptsCustomPayload
  );
}
