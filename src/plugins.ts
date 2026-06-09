import {
  createEditorPluginRegistry,
  getEditorPluginDiagnostics,
  resolveEditorPluginCommands,
  resolveEditorPluginRuntimeOptions,
  type EditorPlugin,
  type EditorPluginDiagnostic,
  type EditorPluginRegistry,
} from "@moritzbrantner/editor-core/plugins";
import type {
  EditorCommandContext,
  EditorCommandDiagnostic,
  EditorResolvedCommandDefinition,
} from "@moritzbrantner/editor-core/commands";
import type {
  EditorOperationPreflightContext,
  EditorOperationPreflightIssue,
} from "@moritzbrantner/editor-core/operations";
import type { EditorRuntimeOptions } from "@moritzbrantner/editor-core/runtime";

import type { GraphEditorDocument, GraphEditorSelectionState, GraphEditorViewport } from "./core";

export type GraphEditorPlugin<
  TDocument = GraphEditorDocument,
  TSelection = GraphEditorSelectionState,
> = EditorPlugin<TDocument, TSelection>;

export type GraphEditorPluginRegistry<
  TDocument = GraphEditorDocument,
  TSelection = GraphEditorSelectionState,
> = EditorPluginRegistry<TDocument, TSelection>;

export type GraphEditorPluginDiagnostic = EditorPluginDiagnostic;

export function createGraphEditorPluginRegistry<
  TDocument = GraphEditorDocument,
  TSelection = GraphEditorSelectionState,
>(
  plugins: readonly GraphEditorPlugin<TDocument, TSelection>[],
): GraphEditorPluginRegistry<TDocument, TSelection> {
  return createEditorPluginRegistry(plugins);
}

export function getGraphEditorPluginDiagnostics<
  TDocument = GraphEditorDocument,
  TSelection = GraphEditorSelectionState,
>(
  registry: GraphEditorPluginRegistry<TDocument, TSelection>,
): readonly (GraphEditorPluginDiagnostic | EditorCommandDiagnostic<string>)[] {
  return getEditorPluginDiagnostics(registry);
}

export function resolveGraphEditorPluginRuntimeOptions<
  TDocument = GraphEditorDocument,
  TSelection = GraphEditorSelectionState,
>(
  registry: GraphEditorPluginRegistry<TDocument, TSelection>,
  baseOptions: EditorRuntimeOptions<TDocument, TSelection>,
): EditorRuntimeOptions<TDocument, TSelection> & {
  preflight: (
    context: EditorOperationPreflightContext<TDocument, TSelection>,
  ) => readonly EditorOperationPreflightIssue[];
} {
  return resolveEditorPluginRuntimeOptions(registry, baseOptions);
}

export function resolveGraphEditorPluginCommands<
  TDocument = GraphEditorDocument,
  TSelection = GraphEditorSelectionState,
  TViewport = GraphEditorViewport,
>(
  registry: GraphEditorPluginRegistry<TDocument, TSelection>,
  context: EditorCommandContext<TDocument, TSelection, TViewport>,
): readonly EditorResolvedCommandDefinition<string>[] {
  return resolveEditorPluginCommands(registry, context);
}
