export interface SiroField {
  name: string;
  position: [number, number]; // [start, end] positions (1-based)
  length: number;
  type: 'numeric' | 'alphanumeric';
  description: string;
}

export interface SiroHeaderRecord {
  recordType: string;
  banelcoCode: string;
  companyCode: string;
  fileDate: string;
  filler: string;
}

export interface SiroDetailRecord {
  recordType: string;
  referenceNumber: string;
  invoiceId: string;
  currencyCode: string;
  firstDueDate: string;
  firstAmount: string;
  secondDueDate: string;
  secondAmount: string;
  thirdDueDate: string;
  thirdAmount: string;
  filler1: string;
  referenceRepeat: string;
  ticketMessage: string;
  screenMessage: string;
  barcode: string;
  filler2: string;
}

export interface SiroFooterRecord {
  recordType: string;
  banelcoCode: string;
  companyCode: string;
  fileDate: string;
  recordCount: string;
  filler1: string;
  totalAmount: string;
  filler2: string;
}

export interface SiroParsedFile {
  fileName: string;
  header: SiroHeaderRecord | null;
  details: SiroDetailRecord[];
  footer: SiroFooterRecord | null;
  totalRecords: number;
  errors: string[];
}
