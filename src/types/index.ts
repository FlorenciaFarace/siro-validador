export interface FileRecord {
  id: string;
  lineNumber: number;
  content: string;
  isValid: boolean;
  errors: string[];
}

export interface ValidationResult {
  fileName: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  records: FileRecord[];
  processingTime: number;
}

export interface ValidationRule {
  name: string;
  description: string;
  validate: (record: string) => { isValid: boolean; errors: string[] };
}

export interface TabConfig {
  id: string;
  label: string;
  component: React.ComponentType<any>;
  validationRules: ValidationRule[];
}

export interface UploadedFile {
  file: File;
  content: string;
  uploadedAt: Date;
}
