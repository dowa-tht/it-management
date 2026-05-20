export const NO_SERIES_DOC_MAPPING = {
  'FR-IT-01': {
    tableName: 'incidents',
    colName: 'case_number',
    displayName: 'Incident Report (FR-IT-01)'
  },
  'Checklist': {
    tableName: 'checklist_docs',
    colName: 'doc_no',
    displayName: 'Checklist (FR-IT-02)'
  },
  'Backup': {
    tableName: 'backup_logs',
    colName: 'doc_no',
    displayName: 'Backup Log (FR-IT-03)'
  },
  'ไม่ผูกกับเอกสาร': {
    tableName: null,
    colName: null,
    displayName: 'ไม่ผูกกับเอกสาร (None)'
  }
}

export const getNoSeriesMapping = () => {
  return NO_SERIES_DOC_MAPPING;
};
