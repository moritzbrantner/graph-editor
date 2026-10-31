"use client";

import * as React from "react";

import { type GraphWorkbenchActionError, type GraphWorkbenchActionErrorCode } from "./types";

export function useGraphWorkbenchActionError(
  onActionError?: (error: GraphWorkbenchActionError) => void,
) {
  const [actionError, setActionError] = React.useState<GraphWorkbenchActionError | null>(null);
  const actionErrorIdRef = React.useRef(0);

  const clearActionError = React.useCallback(() => {
    setActionError(null);
  }, []);

  const reportActionError = React.useCallback(
    (code: GraphWorkbenchActionErrorCode, error: unknown, fallbackMessage: string) => {
      const nextError: GraphWorkbenchActionError = {
        id: `${code}-${++actionErrorIdRef.current}`,
        code,
        message: fallbackMessage,
        ...formatGraphWorkbenchActionErrorDetail(error),
      };
      setActionError(nextError);
      onActionError?.(nextError);
    },
    [onActionError],
  );

  return { actionError, clearActionError, reportActionError };
}

function formatGraphWorkbenchActionErrorDetail(error: unknown) {
  if (error === null || error === undefined) {
    return {};
  }

  if (error instanceof Error) {
    return { detail: error.message };
  }

  return { detail: String(error) };
}
