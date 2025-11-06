export interface Client {
  id: string;
  receiptNumber?: string;
}

export interface Convention {
  id: string;
  recordCount: string;
  clients: Client[];
}

export interface DebtBaseFormData {
  format: 'FULL' | 'BASIC';
  conventions: Convention[];
  firstDueDate: string;
  secondDueDate: string;
  thirdDueDate: string;
  firstAmount: string;
  secondAmount: string;
  thirdAmount: string;
  ticketMessage: string;
  secondaryMessage: string;
  screenMessage: string;
  receiptGeneration: 'AUTOMATIC' | 'MANUAL';
  clientIdGeneration: 'MANUAL' | 'AUTOMATIC';
  period: string; // Format: MMAA
  conceptId: string; // 0-9
}

export const initialClient: Client = {
  id: '',
  receiptNumber: ''
};

export const initialConvention: Convention = {
  id: '',
  recordCount: '1',
  clients: [{ ...initialClient }]
};

export const initialFormData: DebtBaseFormData = {
  format: 'FULL',
  conventions: [{ ...initialConvention }],
  firstDueDate: '',
  secondDueDate: '',
  thirdDueDate: '',
  firstAmount: '',
  secondAmount: '',
  thirdAmount: '',
  ticketMessage: 'PAGO DEUDA',
  secondaryMessage: '',
  screenMessage: 'PAGO DEUDA',
  receiptGeneration: 'AUTOMATIC',
  clientIdGeneration: 'MANUAL',
  period: new Date().toLocaleDateString('es-AR', { month: '2-digit', year: '2-digit' }).replace('/', ''),
  conceptId: '0'
};

/**
 * Formats a receipt number based on the specified parameters
 * @param base The base string (not used in FULL format)
 * @param conceptId The concept ID (0-9)
 * @param period The period in MMAA format (e.g., '1025' for October 2025)
 * @param format The format of the receipt number ('FULL' or 'BASIC')
 * @param occurrence Optional occurrence number for duplicate client IDs (0-9)
 * @returns Formatted receipt number
 */
// Store generated receipt numbers for each client ID
const clientReceiptNumbers = new Map<string, string>();

// Track sequential numbers for clients with more than 10 duplicates (per client+convention)
const sequentialNumbers = new Map<string, number>();

export const formatReceiptNumber = (
  base: string, 
  conceptId: string, 
  period: string, 
  format: 'FULL' | 'BASIC' = 'FULL',
  occurrence: number = 0,
  clientId?: string,
  conventionId?: string
): string => {
  if (format === 'BASIC' && clientId && conventionId) {
    // Create a unique key for this client+convention combination
    const clientConventionKey = `${clientId}_${conventionId}`;
    
    // If we've already generated a receipt number for this client+convention, return it
    if (clientReceiptNumbers.has(clientConventionKey)) {
      return clientReceiptNumbers.get(clientConventionKey)!;
    }

    // For BASIC, derive from FULL for consistency in first 10 occurrences
    if (occurrence < 10) {
      const fullFormatNumber = formatReceiptNumber(
        'IDFACTURABASE00',
        conceptId,
        period,
        'FULL',
        occurrence,
        clientId,
        conventionId
      );
      const receiptNumber = fullFormatNumber.slice(-5);
      clientReceiptNumbers.set(clientConventionKey, receiptNumber);
      return receiptNumber;
    } else {
      // After 10 duplicates, use sequential numbers starting from 00001
      const seqKey = `basic_${clientConventionKey}`;
      const current = sequentialNumbers.get(seqKey) || 1;
      const receiptNumber = current.toString().padStart(5, '0');
      sequentialNumbers.set(seqKey, current + 1);
      clientReceiptNumbers.set(clientConventionKey, receiptNumber);
      return receiptNumber;
    }
  }
  
  // For FULL format:
  // - First 15 chars: Fixed prefix 'IDFACTURABASE00'
  // - For first 10 occurrences: 16th char is occurrence (0-9), followed by period (MMAA)
  // - For more than 10 occurrences: Switch to sequential format 'IDFACTURABASE0000001', 'IDFACTURABASE0000002', etc.
  
  const fixedPrefix = 'IDFACTURABASE00';
  
  // FULL format with client/convention context: switch to sequential after 10th duplicate
  if (format === 'FULL' && clientId && conventionId) {
    const clientConventionKey = `${clientId}_${conventionId}`;
    if (occurrence >= 10) {
      const seqKey = `full_${clientConventionKey}`;
      const seqNum = sequentialNumbers.get(seqKey) || 1;
      // After reaching IDFACTURABASE0091125, vary only the last 5 positions (00001, 00002, ...)
      const lastFive = seqNum.toString().padStart(5, '0');
      const receiptNumber = `${fixedPrefix}${lastFive}`;
      sequentialNumbers.set(seqKey, seqNum + 1);
      return receiptNumber;
    }
  }
  
  // Standard FULL format for first 10 occurrences or when not in convention context
  const currentDate = new Date();
  const currentPeriod = 
    String(currentDate.getMonth() + 1).padStart(2, '0') + // MM
    String(currentDate.getFullYear()).slice(-2); // AA
  
  // If period is provided, use it; otherwise use current period
  const receiptPeriod = period || currentPeriod;
  
  // For the 16th character, use the occurrence number (0-9)
  // If occurrence is 0, it means it's a unique client ID
  const occurrenceDigit = Math.min(occurrence, 9).toString();
  
  return `${fixedPrefix}${occurrenceDigit}${receiptPeriod}`.padEnd(20, '0');
}

// Validation functions
export const validateAlphanumeric = (value: string, maxLength: number): boolean => {
  const regex = /^[A-Z0-9\s]*$/;
  return regex.test(value) && value.length <= maxLength;
};

export const validateClientId = (id: string): boolean => {
  return /^\d{9}$/.test(id);
};

/**
 * Validates a receipt number based on the format and client ID uniqueness
 * @param number The receipt number to validate
 * @param format The format of the receipt number ('FULL' or 'BASIC')
 * @param clientId The client ID for validation (optional, used for FULL format)
 * @param conventionClients Array of client IDs in the same convention (optional, used for FULL format)
 * @returns boolean indicating if the receipt number is valid
 */
export const validateReceiptNumber = (
  number: string, 
  format: 'FULL' | 'BASIC',
  clientId?: string,
  conventionClients: string[] = []
): boolean => {
  if (format === 'BASIC') {
    return /^\d{5}$/.test(number);
  }
  
  // For FULL format, check the basic structure first
  if (!/^[A-Z0-9\s]{15}\d{5}$/.test(number)) {
    return false;
  }
  
  // If client ID and convention clients are provided, validate the 16th digit
  if (clientId && conventionClients.length > 0) {
    const isClientIdUnique = conventionClients.filter(id => id === clientId).length === 1;
    const sixteenthDigit = number.charAt(15);
    
    if (isClientIdUnique) {
      // For unique client IDs, 16th digit must be '0'
      return sixteenthDigit === '0';
    } else {
      // For duplicate client IDs, 16th digit must be between 0-9
      return /^[0-9]$/.test(sixteenthDigit);
    }
  }
  
  return true;
};
