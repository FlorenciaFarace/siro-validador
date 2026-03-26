// ─────────────────────────────────────────────────────────────────────────────
// Barcode Types – SIRO Barcode Generator
// Supports formats: 0444, 0447 (I2of5, 56 digits)
//                   0448, 0449 (Code 128, 59 digits)
// ─────────────────────────────────────────────────────────────────────────────

export type BarcodeFormat = '0444' | '0447' | '0448' | '0449';

export type BarcodeMode = 'CLOSED' | 'OPEN';

export type BarcodeSymbology = 'I2of5' | 'Code128';

// ─── Duetype per format ──────────────────────────────────────────────────────

export interface DueDateEntry {
  /** YYYY-MM-DD (HTML date input format) */
  date: string;
  /** Argentine pesos, dot-separated decimals: e.g. "12345.50" */
  amount: string;
}

// ─── Form state ──────────────────────────────────────────────────────────────

export interface BarcodeFormData {
  format: BarcodeFormat;
  mode: BarcodeMode;
  /** Up to 15 digits for 0448, up to 9 for others */
  clientId: string;
  /** 10-digit convention/account ID from BANCO ROELA */
  conventionId: string;
  /** Always present (first due date + amount) */
  due1: DueDateEntry;
  /** Optional second due date/amount (required field pair: both or neither) */
  due2: DueDateEntry;
  /** Optional third due date/amount – only for 0444, 0447, 0449 */
  due3: DueDateEntry;
}

// ─── Result ──────────────────────────────────────────────────────────────────

export interface BarcodeResult {
  /** Full numeric string including check digits */
  numericString: string;
  /** String before check digits (for visual display) */
  payload: string;
  dv1: number;
  dv2: number;
  symbology: BarcodeSymbology;
  format: BarcodeFormat;
}

// ─── Format metadata ─────────────────────────────────────────────────────────

export interface BarcodeFormatMeta {
  label: string;
  symbology: BarcodeSymbology;
  clientIdMaxLength: number;
  totalDigits: number;
  /** Number of supported due-date/amount pairs (1–3) */
  dueDates: 2 | 3;
  /** Max amount digits (integer part before applying 2 decimal places) */
  amountIntegerDigits: number;
  /** Total amount field length including 2 decimal digits */
  amountFieldLength: number;
  /** Max displayable amount (human-readable) */
  maxAmountDisplay: string;
}

export const BARCODE_FORMAT_META: Record<BarcodeFormat, BarcodeFormatMeta> = {
  '0444': {
    label: '0444',
    symbology: 'I2of5',
    clientIdMaxLength: 9,
    totalDigits: 56,
    dueDates: 3,
    amountIntegerDigits: 5,
    amountFieldLength: 7,
    maxAmountDisplay: '$99.999,99',
  },
  '0447': {
    label: '0447',
    symbology: 'I2of5',
    clientIdMaxLength: 9,
    totalDigits: 56,
    dueDates: 3,
    amountIntegerDigits: 5,
    amountFieldLength: 7,
    maxAmountDisplay: '$99.999,99',
  },
  '0448': {
    label: '0448',
    symbology: 'Code128',
    clientIdMaxLength: 15,
    totalDigits: 59,
    dueDates: 2,
    amountIntegerDigits: 8,
    amountFieldLength: 10,
    maxAmountDisplay: '$99.999.999,99',
  },
  '0449': {
    label: '0449',
    symbology: 'Code128',
    clientIdMaxLength: 9,
    totalDigits: 59,
    dueDates: 3,
    amountIntegerDigits: 6,
    amountFieldLength: 8,
    maxAmountDisplay: '$999.999,99',
  },
};

// ─── Initial values ───────────────────────────────────────────────────────────

export const INITIAL_DUE_ENTRY: DueDateEntry = { date: '', amount: '' };

export const INITIAL_BARCODE_FORM: BarcodeFormData = {
  format: '0444',
  mode: 'CLOSED',
  clientId: '',
  conventionId: '',
  due1: { ...INITIAL_DUE_ENTRY },
  due2: { ...INITIAL_DUE_ENTRY },
  due3: { ...INITIAL_DUE_ENTRY },
};
