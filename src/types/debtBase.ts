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
  ticketMessage: '',
  secondaryMessage: '',
  screenMessage: '',
  receiptGeneration: 'AUTOMATIC',
  period: new Date().toLocaleDateString('es-AR', { month: '2-digit', year: '2-digit' }).replace('/', ''),
  conceptId: '0'
};

// Helper function to format receipt number
export const formatReceiptNumber = (base: string, conceptId: string, period: string, format: 'FULL' | 'BASIC' = 'FULL'): string => {
  if (format === 'BASIC') {
    return `${conceptId}${period}`.padEnd(5, '0').substring(0, 5);
  }
  return `${base.padEnd(15, ' ').substring(0, 15)}${conceptId}${period}`.padEnd(20, '0');
};

// Validation functions
export const validateAlphanumeric = (value: string, maxLength: number): boolean => {
  const regex = /^[A-Z0-9\s]*$/;
  return regex.test(value) && value.length <= maxLength;
};

export const validateClientId = (id: string): boolean => {
  return /^\d{9}$/.test(id);
};

export const validateReceiptNumber = (number: string, format: 'FULL' | 'BASIC'): boolean => {
  if (format === 'BASIC') {
    return /^\d{5}$/.test(number);
  }
  return /^[A-Z0-9\s]{15}\d{5}$/.test(number);
};
