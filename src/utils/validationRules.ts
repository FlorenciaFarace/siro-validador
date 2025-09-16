import { ValidationRule } from '@/types';

export const basicValidationRules: ValidationRule[] = [
  {
    name: 'No vacío',
    description: 'El registro no debe estar vacío',
    validate: (record: string) => {
      const isValid = record.trim().length > 0;
      return {
        isValid,
        errors: isValid ? [] : ['El registro está vacío']
      };
    }
  },
  {
    name: 'Longitud mínima',
    description: 'El registro debe tener al menos 5 caracteres',
    validate: (record: string) => {
      const isValid = record.trim().length >= 5;
      return {
        isValid,
        errors: isValid ? [] : ['El registro debe tener al menos 5 caracteres']
      };
    }
  }
];

export const formatValidationRules: ValidationRule[] = [
  {
    name: 'Formato numérico',
    description: 'Valida que el registro contenga solo números',
    validate: (record: string) => {
      const isValid = /^\d+$/.test(record.trim());
      return {
        isValid,
        errors: isValid ? [] : ['El registro debe contener solo números']
      };
    }
  },
  {
    name: 'Formato alfanumérico',
    description: 'Valida que el registro contenga solo letras y números',
    validate: (record: string) => {
      const isValid = /^[a-zA-Z0-9\s]+$/.test(record.trim());
      return {
        isValid,
        errors: isValid ? [] : ['El registro debe contener solo letras, números y espacios']
      };
    }
  }
];

export const structureValidationRules: ValidationRule[] = [
  {
    name: 'Formato CSV',
    description: 'Valida que el registro tenga formato CSV con al menos 2 campos',
    validate: (record: string) => {
      const fields = record.split(',').map(f => f.trim());
      const isValid = fields.length >= 2 && fields.every(f => f.length > 0);
      return {
        isValid,
        errors: isValid ? [] : ['El registro debe tener formato CSV con al menos 2 campos no vacíos']
      };
    }
  },
  {
    name: 'Formato con separador |',
    description: 'Valida que el registro use | como separador con al menos 3 campos',
    validate: (record: string) => {
      const fields = record.split('|').map(f => f.trim());
      const isValid = fields.length >= 3 && fields.every(f => f.length > 0);
      return {
        isValid,
        errors: isValid ? [] : ['El registro debe usar | como separador con al menos 3 campos no vacíos']
      };
    }
  }
];

export const customValidationRules: ValidationRule[] = [
  {
    name: 'Longitud exacta',
    description: 'Valida que el registro tenga exactamente 10 caracteres',
    validate: (record: string) => {
      const isValid = record.trim().length === 10;
      return {
        isValid,
        errors: isValid ? [] : ['El registro debe tener exactamente 10 caracteres']
      };
    }
  },
  {
    name: 'Contiene palabra clave',
    description: 'Valida que el registro contenga la palabra "SIRO"',
    validate: (record: string) => {
      const isValid = record.toUpperCase().includes('SIRO');
      return {
        isValid,
        errors: isValid ? [] : ['El registro debe contener la palabra "SIRO"']
      };
    }
  }
];
