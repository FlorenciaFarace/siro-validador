// ─────────────────────────────────────────────────────────────────────────────
// barcodeBuilder.ts – SIRO Barcode Builder Utility
//
// Builds the numeric payload and computes the two check digits for SIRO
// barcode formats 0444, 0447 (Interleaved 2 of 5) and 0448, 0449 (Code 128).
// ─────────────────────────────────────────────────────────────────────────────

import {
  BarcodeFormat,
  BarcodeFormData,
  BarcodeResult,
  BARCODE_FORMAT_META,
  BarcodeMode,
  DueDateEntry,
} from '@/types/barcode';

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Converts a YYYY-MM-DD string to AAMMDD format required by SIRO barcodes.
 * Returns '000000' for empty / invalid input.
 */
export function dateToAaMMDD(isoDate: string): string {
  if (!isoDate) return '000000';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return '000000';
  const aa = year.slice(-2); // last 2 digits of year
  return `${aa}${month}${day}`;
}

/**
 * Returns the absolute number of calendar days between two ISO dates.
 * Returns 0 if either date is empty or the same.
 */
export function daysBetween(earlier: string, later: string): number {
  if (!earlier || !later) return 0;
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// ─── Amount helpers ───────────────────────────────────────────────────────────

/**
 * Parses a human-entered amount string ("1234.50", "1234,50", "$ 1.234,00")
 * and returns the integer number of centavos (×100), or 0 if invalid.
 */
export function parseAmountCents(raw: string): number {
  if (!raw) return 0;
  // Remove currency symbol, spaces, thousand separators (both . and ,)
  // Strategy: if both '.' and ',' appear, the last one is the decimal separator
  let cleaned = raw.replace(/[^0-9.,]/g, '');
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot > lastComma) {
    // Dot is the decimal separator → remove commas used as thousand sep
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma > lastDot) {
    // Comma is the decimal separator → remove dots used as thousand sep
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

/**
 * Formats centavos into a zero-padded string of the given total length.
 * E.g. 1012300 cents → "1012300" (7 chars for 0444/0447)
 */
export function formatAmountField(cents: number, fieldLength: number): string {
  return cents.toString().padStart(fieldLength, '0').slice(0, fieldLength);
}

/**
 * Returns the max number of centavos for a format (derived from integer digits).
 * e.g. 5 integer digits → max 99999.99 → 9999999 cents (7-digit field)
 */
export function maxCentsForFormat(amountFieldLength: number): number {
  // field = integerDigits + 2 decimal digits
  return Math.pow(10, amountFieldLength) - 1;
}

// ─── Check-digit algorithm ────────────────────────────────────────────────────

/**
 * SIRO check-digit sequence: 1, 3, 5, 7, 9, 3, 5, 7, 9, …
 * Position 0 uses weight 1; subsequent positions cycle through [3,5,7,9].
 */
function weightAt(index: number): number {
  if (index === 0) return 1;
  const cycle = [3, 5, 7, 9];
  return cycle[(index - 1) % 4];
}

/**
 * Computes SIRO check digits DV1 and DV2 for a numeric payload string
 * (without the final 2 check-digit positions).
 *
 * Algorithm validated against SIRO official Excel workbook
 * (SIRO-Developers-Calculo-del-Digito-Verificador.xls):
 *   1. Assign sequence 1,3,5,7,9,3,5,7,9,… to each digit.
 *   2. Multiply each digit by its weight.
 *   3. Sum the products.
 *   4. Divide by 2 → sum2 = sum / 2.
 *   5. DV1 = floor(sum2) % 10
 *   6. Re-run steps 1..5 over (payload + DV1); that remainder is DV2.
 */
export function computeCheckDigits(payload: string): { dv1: number; dv2: number } {
  if (!/^\d+$/.test(payload)) {
    throw new Error(`Payload must be numeric. Got: "${payload}"`);
  }

  const remainderFromString = (numeric: string): number => {
    let sum = 0;
    for (let i = 0; i < numeric.length; i++) {
      sum += parseInt(numeric[i], 10) * weightAt(i);
    }
    return Math.floor(sum / 2) % 10;
  };

  const dv1 = remainderFromString(payload);
  const dv2 = remainderFromString(`${payload}${dv1}`);

  return { dv1, dv2 };
}

// ─── Payload builders per format ──────────────────────────────────────────────

/**
 * Builds the payload (without check digits) for formats 0444 and 0447.
 * Total payload length: 54 chars (+ 2 check digits = 56 total).
 *
 * Structure:
 *  [01-04] Format code           (4)
 *  [05-13] Client ID             (9, left-padded)
 *  [14-19] Due date 1 AAMMDD    (6)
 *  [20-26] Amount 1              (7)
 *  [27-28] Days to due date 2    (2)
 *  [29-35] Amount 2              (7)
 *  [36-37] Days to due date 3    (2)
 *  [38-44] Amount 3              (7)
 *  [45-54] Convention ID         (10)
 */
function buildPayload_0444_0447(
  format: BarcodeFormat,
  clientId: string,
  conventionId: string,
  mode: BarcodeMode,
  due1: DueDateEntry,
  due2: DueDateEntry,
  due3: DueDateEntry,
): string {
  const meta = BARCODE_FORMAT_META[format];
  const client = clientId.padStart(meta.clientIdMaxLength, '0').slice(-meta.clientIdMaxLength);
  const convention = conventionId.padStart(10, '0').slice(-10);

  if (mode === 'OPEN') {
    return `${format}${client}${'0'.repeat(31)}${convention}`;
  }

  const date1 = dateToAaMMDD(due1.date);
  const cents1 = parseAmountCents(due1.amount);
  const amount1 = formatAmountField(cents1, meta.amountFieldLength);

  const hasdue2 = due2.date && due2.amount;
  const days12 = hasdue2 ? daysBetween(due1.date, due2.date) : 0;
  const days12str = days12.toString().padStart(2, '0').slice(0, 2);
  const cents2 = hasdue2 ? parseAmountCents(due2.amount) : 0;
  const amount2 = formatAmountField(cents2, meta.amountFieldLength);

  const hasdue3 = due3.date && due3.amount;
  const days23 = hasdue3 ? daysBetween(due2.date, due3.date) : 0;
  const days23str = days23.toString().padStart(2, '0').slice(0, 2);
  const cents3 = hasdue3 ? parseAmountCents(due3.amount) : 0;
  const amount3 = formatAmountField(cents3, meta.amountFieldLength);

  return `${format}${client}${date1}${amount1}${days12str}${amount2}${days23str}${amount3}${convention}`;
}

/**
 * Builds the payload for format 0449.
 * Total payload length: 57 chars (+ 2 check digits = 59 total).
 *
 * Structure:
 *  [01-04]  Format code          (4)
 *  [05-13]  Client ID            (9, left-padded)
 *  [14-19]  Due date 1 AAMMDD   (6)
 *  [20-27]  Amount 1             (8)
 *  [28-29]  Days to due date 2   (2)
 *  [30-37]  Amount 2             (8)
 *  [38-39]  Days to due date 3   (2)
 *  [40-47]  Amount 3             (8)
 *  [48-57]  Convention ID        (10)
 */
function buildPayload_0449(
  clientId: string,
  conventionId: string,
  mode: BarcodeMode,
  due1: DueDateEntry,
  due2: DueDateEntry,
  due3: DueDateEntry,
): string {
  const meta = BARCODE_FORMAT_META['0449'];
  const client = clientId.padStart(9, '0').slice(-9);
  const convention = conventionId.padStart(10, '0').slice(-10);

  if (mode === 'OPEN') {
    return `0449${client}${'0'.repeat(34)}${convention}`;
  }

  const date1 = dateToAaMMDD(due1.date);
  const cents1 = parseAmountCents(due1.amount);
  const amount1 = formatAmountField(cents1, meta.amountFieldLength);

  const hasdue2 = due2.date && due2.amount;
  const days12 = hasdue2 ? daysBetween(due1.date, due2.date) : 0;
  const days12str = days12.toString().padStart(2, '0').slice(0, 2);
  const cents2 = hasdue2 ? parseAmountCents(due2.amount) : 0;
  const amount2 = formatAmountField(cents2, meta.amountFieldLength);

  const hasdue3 = due3.date && due3.amount;
  const days23 = hasdue3 ? daysBetween(due2.date, due3.date) : 0;
  const days23str = days23.toString().padStart(2, '0').slice(0, 2);
  const cents3 = hasdue3 ? parseAmountCents(due3.amount) : 0;
  const amount3 = formatAmountField(cents3, meta.amountFieldLength);

  return `0449${client}${date1}${amount1}${days12str}${amount2}${days23str}${amount3}${convention}`;
}

/**
 * Builds the payload for format 0448.
 * Total payload length: 57 chars (+ 2 check digits = 59 total).
 *
 * Structure:
 *  [01-04]  Format code          (4)
 *  [05-19]  Client ID            (15, left-padded)
 *  [20-25]  Due date 1 AAMMDD   (6)
 *  [26-35]  Amount 1             (10)
 *  [36-37]  Days to due date 2   (2)
 *  [38-47]  Amount 2             (10)
 *  [48-57]  Convention ID        (10)
 */
function buildPayload_0448(
  clientId: string,
  conventionId: string,
  mode: BarcodeMode,
  due1: DueDateEntry,
  due2: DueDateEntry,
): string {
  const meta = BARCODE_FORMAT_META['0448'];
  const client = clientId.padStart(15, '0').slice(-15);
  const convention = conventionId.padStart(10, '0').slice(-10);

  if (mode === 'OPEN') {
    return `0448${client}${'0'.repeat(28)}${convention}`;
  }

  const date1 = dateToAaMMDD(due1.date);
  const cents1 = parseAmountCents(due1.amount);
  const amount1 = formatAmountField(cents1, meta.amountFieldLength);

  const hasdue2 = due2.date && due2.amount;
  const days12 = hasdue2 ? daysBetween(due1.date, due2.date) : 0;
  const days12str = days12.toString().padStart(2, '0').slice(0, 2);
  const cents2 = hasdue2 ? parseAmountCents(due2.amount) : 0;
  const amount2 = formatAmountField(cents2, meta.amountFieldLength);

  return `0448${client}${date1}${amount1}${days12str}${amount2}${convention}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds the complete barcode result (payload + check digits) from form data.
 * Throws if the payload length does not match the expected total minus 2.
 */
export function buildBarcodeResult(form: BarcodeFormData): BarcodeResult {
  const meta = BARCODE_FORMAT_META[form.format];
  const expectedPayloadLength = meta.totalDigits - 2;

  let payload: string;

  switch (form.format) {
    case '0444':
    case '0447':
      payload = buildPayload_0444_0447(
        form.format,
        form.clientId,
        form.conventionId,
        form.mode,
        form.due1,
        form.due2,
        form.due3,
      );
      break;
    case '0449':
      payload = buildPayload_0449(
        form.clientId,
        form.conventionId,
        form.mode,
        form.due1,
        form.due2,
        form.due3,
      );
      break;
    case '0448':
      payload = buildPayload_0448(
        form.clientId,
        form.conventionId,
        form.mode,
        form.due1,
        form.due2,
      );
      break;
    default:
      throw new Error(`Unknown format: ${form.format}`);
  }

  if (payload.length !== expectedPayloadLength) {
    throw new Error(
      `Payload length mismatch for ${form.format}: expected ${expectedPayloadLength}, got ${payload.length}. Payload: "${payload}"`,
    );
  }

  const { dv1, dv2 } = computeCheckDigits(payload);
  const numericString = `${payload}${dv1}${dv2}`;

  return {
    numericString,
    payload,
    dv1,
    dv2,
    symbology: meta.symbology,
    format: form.format,
  };
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export interface BarcodeFormErrors {
  format?: string;
  clientId?: string;
  conventionId?: string;
  due1Date?: string;
  due1Amount?: string;
  due2Date?: string;
  due2Amount?: string;
  due3Date?: string;
  due3Amount?: string;
}

/**
 * Validates the form data and returns an errors map.
 * An empty map means the form is valid.
 */
export function validateBarcodeForm(form: BarcodeFormData): BarcodeFormErrors {
  const errors: BarcodeFormErrors = {};
  const meta = BARCODE_FORMAT_META[form.format];

  // Client ID
  const clientDigits = form.clientId.replace(/\D/g, '');
  if (!clientDigits) {
    errors.clientId = 'El ID de cliente es requerido';
  } else if (clientDigits.length > meta.clientIdMaxLength) {
    errors.clientId = `Máximo ${meta.clientIdMaxLength} dígitos`;
  }

  // Convention ID
  if (!/^\d{10}$/.test(form.conventionId)) {
    errors.conventionId = 'Debe tener exactamente 10 dígitos';
  }

  if (form.mode === 'CLOSED') {
    // Due date 1 – always required
    if (!form.due1.date) {
      errors.due1Date = 'La fecha de 1er vencimiento es requerida';
    }
    if (!form.due1.amount) {
      errors.due1Amount = 'El importe de 1er vencimiento es requerido';
    } else {
      const cents = parseAmountCents(form.due1.amount);
      const maxCents = maxCentsForFormat(meta.amountFieldLength);
      if (cents <= 0) errors.due1Amount = 'Importe inválido';
      else if (cents > maxCents)
        errors.due1Amount = `Importe máximo: ${meta.maxAmountDisplay}`;
    }

    // Due date 2 – optional but must be paired
    const has2date = !!form.due2.date;
    const has2amount = !!(form.due2.amount && form.due2.amount.trim());
    if (has2date && !has2amount) errors.due2Amount = 'Ingrese el importe para el 2do vencimiento';
    if (!has2date && has2amount) errors.due2Date = 'Ingrese la fecha para el 2do vencimiento';
    if (has2date && form.due1.date && form.due2.date <= form.due1.date) {
      errors.due2Date = 'Debe ser posterior al 1er vencimiento';
    }
    if (has2amount) {
      const cents = parseAmountCents(form.due2.amount);
      const maxCents = maxCentsForFormat(meta.amountFieldLength);
      if (cents <= 0) errors.due2Amount = 'Importe inválido';
      else if (cents > maxCents)
        errors.due2Amount = `Importe máximo: ${meta.maxAmountDisplay}`;
    }

    // Due date 3 – optional, only for formats with 3 due dates, must be paired
    if (meta.dueDates === 3) {
      const has3date = !!form.due3.date;
      const has3amount = !!(form.due3.amount && form.due3.amount.trim());
      if (has3date && !has3amount) errors.due3Amount = 'Ingrese el importe para el 3er vencimiento';
      if (!has3date && has3amount) errors.due3Date = 'Ingrese la fecha para el 3er vencimiento';
      if (has3date && form.due2.date && form.due3.date <= form.due2.date) {
        errors.due3Date = 'Debe ser posterior al 2do vencimiento';
      }
      if (has3date && !form.due2.date) {
        errors.due3Date = 'Debe ingresarse el 2do vencimiento primero';
      }
      if (has3amount) {
        const cents = parseAmountCents(form.due3.amount);
        const maxCents = maxCentsForFormat(meta.amountFieldLength);
        if (cents <= 0) errors.due3Amount = 'Importe inválido';
        else if (cents > maxCents)
          errors.due3Amount = `Importe máximo: ${meta.maxAmountDisplay}`;
      }
    }
  }

  return errors;
}

// ─── Random ID generator ──────────────────────────────────────────────────────

/** Generates a random numeric string of exactly `digits` characters. */
export function generateRandomClientId(digits: number): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}
