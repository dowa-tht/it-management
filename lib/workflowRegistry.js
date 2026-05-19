/**
 * 📑 Document Registry for Unified Workflow Engine
 * Maps document types to their respective database tables and configuration keys.
 * 
 * 🚨 CRITICAL: NON-BREAK CONTRACT 🚨
 * DO NOT modify the structure of `table`, `status_field`, or `workflow_status_field`
 * unless you are also migrating the corresponding database RPC (`handle_approval_step`).
 * The DB relies on this exact structure to perform atomic state transitions.
 */
export const WORKFLOW_DOC_REGISTRY = {
  incident: {
    table: 'incidents',
    condition_key: 'severity', // Grouping key (Severity: High, Medium, Low)
    no_field: 'case_number',
    title_field: 'title',
    status_field: 'status',
    workflow_status_field: 'workflow_status',
    sla_targets: {
      High:   { response: 60,   resolve: 240  },
      Medium: { response: 120,  resolve: 480  },
      Low:    { response: 360,  resolve: 1620 } // 6 hours response, 3 days resolution (Thai biz hours)
    }
  },
  checklist: {
    table: 'checklist_docs',
    condition_key: 'freq_type', // Grouping key (Daily, Weekly, Monthly, Yearly)
    no_field: 'id',
    title_field: 'freq_type',
    status_field: 'status',
    workflow_status_field: 'workflow_status'
  }
}

/**
 * 🔢 Normalized Integer-based Routing Map
 * Standardizes string values to integers for more robust database queries and routing.
 */
export const WORKFLOW_CONDITION_MAP = {
  severity: {
    'Low': 0,
    'Medium': 1,
    'High': 2
  },
  freq_type: {
    'Daily': 0,
    'Weekly': 1,
    'Monthly': 2,
    'Yearly': 3
  }
}

/**
 * Helper to get mapped integer value or original if not found
 */
export function getMappedWorkflowValue(key, value) {
  if (WORKFLOW_CONDITION_MAP[key] && WORKFLOW_CONDITION_MAP[key][value] !== undefined) {
    return WORKFLOW_CONDITION_MAP[key][value]
  }
  return value
}
