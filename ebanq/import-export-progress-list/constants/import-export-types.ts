import { SelectItemInterface } from '@interfaces/selectItemInterface';

export const IMPORT_EXPORT_TYPES_DATA_MAP: { [key: string]: SelectItemInterface } = {
  csvImport: { key: 'csv_import', value: 'Import' },
  csvExport: { key: 'csv_export', value: 'Export' }
};

export const IMPORT_EXPORT_TYPES: SelectItemInterface[] = [
  { key: '', value: 'All Job Types' },
  { ...IMPORT_EXPORT_TYPES_DATA_MAP.csvImport },
  { ...IMPORT_EXPORT_TYPES_DATA_MAP.csvExport },
];

export const IMPORT_EXPORT_STATUS_MAP = {
  allStatuses: { key: '', value: 'All Statuses' },
  pending: { key: 'pending', value: 'Pending' },
  inProgress: { key: 'in_progress', value: 'In progress' },
  failed: { key: 'failed', value: 'Failed' },
  completed: { key: 'finished', value: 'Completed' },
};

export const IMPORT_EXPORT_STATUSES: SelectItemInterface[] = [
  { ...IMPORT_EXPORT_STATUS_MAP.allStatuses },
  { ...IMPORT_EXPORT_STATUS_MAP.pending },
  { ...IMPORT_EXPORT_STATUS_MAP.inProgress },
  { ...IMPORT_EXPORT_STATUS_MAP.failed },
  { ...IMPORT_EXPORT_STATUS_MAP.completed },
];
