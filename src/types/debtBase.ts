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

// Track the last used concept ID for each client ID and convention
const clientConceptCounters = new Map<string, number>();

// Track sequential numbers for clients with more than 10 duplicates
const sequentialNumbers = new Map<string, number>();

// Track client ID occurrences
const clientIdCounts = new Map<string, number>();

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

    // Count occurrences of this client ID in the current convention
    const count = clientIdCounts.get(clientConventionKey) || 0;
    clientIdCounts.set(clientConventionKey, count + 1);

    // First generate the FULL format receipt number
    const fullFormatNumber = formatReceiptNumber(
      'IDFACTURABASE00',
      conceptId,
      period,
      'FULL',
      count,
      clientId,
      conventionId
    );
    
    // For BASIC format, use last 5 digits of the FULL format receipt number
    let receiptNumber: string;
    if (count < 10) {
      // First 10 duplicates: Use last 5 digits of FULL format
      receiptNumber = fullFormatNumber.slice(-5);
    } else {
      // For more than 10 duplicates, use sequential numbering (00001, 00002, etc.)
      const seqNum = (sequentialNumbers.get(conventionId) || 0) + 1;
      sequentialNumbers.set(conventionId, seqNum);
      receiptNumber = seqNum.toString().padStart(5, '0');
    }
    
    // Store the generated receipt number for this client ID
    clientReceiptNumbers.set(clientConventionKey, receiptNumber);
    
    return receiptNumber;
  }
  
  // For FULL format:
  // - First 15 chars: Fixed prefix 'IDFACTURABASE00'
  // - 16th char: 0 for unique client ID, or 1-9 for duplicates
  // - Last 4 chars: Period in MMAA format
  const fixedPrefix = 'IDFACTURABASE00';
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
