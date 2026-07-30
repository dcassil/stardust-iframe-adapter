/**
 * Editing context: shares the operation callbacks + current selection between
 * the editing layer and its children (overlays, panel). Small and demo-local.
 */

import { createContext } from "react";
import type { OperationCallbacks } from "@stardust-cms/iframe-adapter/host";

export interface EditingContextValue {
  operationCallbacks: OperationCallbacks;
  selectedTargetId: string | null;
  selectedContentId: string | null;
}

export const EditingContext = createContext<EditingContextValue | null>(null);
