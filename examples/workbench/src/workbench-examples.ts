import type { WorkbenchExampleDefinition } from "./workbench-example-types";
import { workbenchExamplesA } from "./workbench-examples-a";
import { workbenchExamplesB } from "./workbench-examples-b";

export type {
  WorkbenchExampleDefinition,
  WorkflowEdgeData,
  WorkflowExampleId,
  WorkflowNodeData,
  WorkflowPortType,
} from "./workbench-example-types";
export { workflowNodeTemplates } from "./workbench-node-templates";

export const workbenchExamples: WorkbenchExampleDefinition[] = [
  ...workbenchExamplesA,
  ...workbenchExamplesB,
];

export const defaultWorkbenchExample = workbenchExamples[0];

export function cloneWorkbenchExampleDocument(example: WorkbenchExampleDefinition) {
  return structuredClone(example.document);
}
