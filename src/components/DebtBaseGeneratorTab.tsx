'use client';

import { useState, useEffect } from 'react';
import { 
  DebtBaseFormData, 
  Convention, 
  initialFormData, 
  initialConvention, 
  initialClient, 
  validateReceiptNumber,
  formatReceiptNumber
} from '@/types/debtBase';
import { format, addDays, isBefore, parse } from 'date-fns';

export default function DebtBaseGeneratorTab() {
  const [formData, setFormData] = useState<DebtBaseFormData>(() => {
    const data = { ...initialFormData };
    // Initialize with current period (MMAA)
    const today = new Date();
    data.period = format(today, 'MM') + format(today, 'yy');
    return data;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [debtBaseContent, setDebtBaseContent] = useState<string>('');
  const [activeConventionIndex, setActiveConventionIndex] = useState<number>(0);
  const [isFormReady, setIsFormReady] = useState<boolean>(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Check if form is ready for generation (has client IDs and generation type selected)
  useEffect(() => {
    const hasClientIds = formData.conventions.every(convention => 
      convention.clients.every(client => client.id.length === 9)
    );
    
    setIsFormReady(
      hasClientIds && 
      formData.receiptGeneration === 'AUTOMATIC' && 
      formData.conceptId.length === 1
    );
  }, [formData.conventions, formData.receiptGeneration, formData.conceptId]);

  // Generate random 9-digit client ID
  const generateRandomClientId = (): string => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  // Generate client IDs for all clients
  const generateClientIds = () => {
    const newConventions = [...formData.conventions];
    
    newConventions.forEach(convention => {
      convention.clients.forEach(client => {
        if (!client.id) {
          client.id = generateRandomClientId();
        }
      });
    });
    
    setFormData(prev => ({
      ...prev,
      conventions: newConventions
    }));
  };

  // Generate receipt numbers for all clients
  const generateReceipts = () => {
    const newConventions = [...formData.conventions];
    
    newConventions.forEach(convention => {
      // Track occurrences of each client ID within this convention
      const clientIdCounts: Record<string, number> = {};
      
      convention.clients.forEach(client => {
        if (formData.receiptGeneration === 'AUTOMATIC' && client.id) {
          // Count occurrences of this client ID to handle duplicates
          const count = clientIdCounts[client.id] || 0;
          clientIdCounts[client.id] = count + 1;
          
          // For BASIC format, we need to pass the total number of clients in the convention
          if (formData.format === 'FULL') {
            // For FULL format, use the existing formatReceiptNumber
            client.receiptNumber = formatReceiptNumber(
              '', // Base not used in current implementation
              formData.conceptId,
              formData.period,
              'FULL',
              count // occurrence (0 for first, 1 for second, etc.)
            );
          } else {
            // For BASIC format, pass the total number of clients in the convention
            client.receiptNumber = formatReceiptNumber(
              '',
              formData.conceptId,
              formData.period,
              'BASIC',
              count,
              convention.clients.length // Pass the total number of clients in this convention
            );
          }
        }
      });
    });
    
    setFormData(prev => ({
      ...prev,
      conventions: newConventions
    }));
  };

  // Update clients when record count changes
  useEffect(() => {
    const updatedConventions = [...formData.conventions];
    let needsUpdate = false;

    updatedConventions.forEach((convention, index) => {
      const recordCount = parseInt(convention.recordCount) || 0;
      if (convention.clients.length !== recordCount) {
        needsUpdate = true;
        if (recordCount > convention.clients.length) {
          // Add new clients
          const newClients = Array(recordCount - convention.clients.length)
            .fill(null)
            .map(() => ({ ...initialClient }));
          updatedConventions[index].clients = [...convention.clients, ...newClients];
        } else {
          // Remove extra clients
          updatedConventions[index].clients = convention.clients.slice(0, recordCount);
        }
      }
    });

    if (needsUpdate) {
      setFormData(prev => ({
        ...prev,
        conventions: updatedConventions
      }));
    }
  }, [formData.conventions.map(c => c.recordCount).join(',')]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate conventions
    formData.conventions.forEach((conv, index) => {
      if (!/^\d{10}$/.test(conv.id)) {
        newErrors[`convention-${index}-id`] = 'El ID de convenio debe tener 10 dígitos';
      }
      if (!/^\d+$/.test(conv.recordCount) || parseInt(conv.recordCount) <= 0) {
        newErrors[`convention-${index}-count`] = 'La cantidad debe ser un número mayor a 0';
      }

      // Validate clients
      conv.clients.forEach((client, clientIndex) => {
        if (!/^\d{9}$/.test(client.id)) {
          newErrors[`client-${index}-${clientIndex}-id`] = 'El ID de cliente debe tener 9 dígitos';
        }
        
        if (formData.receiptGeneration === 'MANUAL' && client.receiptNumber) {
          const clientIds = formData.conventions[index].clients.map((client: { id: string }) => client.id);
          const isValid = validateReceiptNumber(
            client.receiptNumber, 
            formData.format,
            client.id,
            clientIds
          );
          
          if (!isValid) {
            if (formData.format === 'FULL') {
              const isDuplicate = clientIds.filter(id => id === client.id).length > 1;
              if (client.receiptNumber.length !== 20) {
                newErrors[`client-${index}-${clientIndex}-receipt`] = 'El número de comprobante debe tener 20 caracteres.';
              } else if (isDuplicate && !/^[A-Z0-9\s]{15}[0-9]\d{4}$/.test(client.receiptNumber)) {
                newErrors[`client-${index}-${clientIndex}-receipt`] = 'Para IDs duplicados, el 16to dígito debe ser entre 1-9.';
              } else if (!isDuplicate && !/^[A-Z0-9\s]{15}0\d{4}$/.test(client.receiptNumber)) {
                newErrors[`client-${index}-${clientIndex}-receipt`] = 'Para IDs únicos, el 16to dígito debe ser 0.';
              } else {
                newErrors[`client-${index}-${clientIndex}-receipt`] = 'Formato de comprobante inválido para el formato FULL.';
              }
            } else {
              // BASIC format validation
              if (!/^\d{5}$/.test(client.receiptNumber)) {
                newErrors[`client-${index}-${clientIndex}-receipt`] = 'En formato BÁSICO, el número de comprobante debe tener exactamente 5 dígitos numéricos.';
              }
            }
          }
        }
      });
    });

    // Validate dates
    const firstDate = new Date(formData.firstDueDate);
    const secondDate = formData.secondDueDate ? new Date(formData.secondDueDate) : null;
    const thirdDate = formData.thirdDueDate ? new Date(formData.thirdDueDate) : null;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (!formData.firstDueDate || isBefore(new Date(formData.firstDueDate), todayDate)) {
      newErrors['firstDueDate'] = 'La fecha debe ser igual o posterior a hoy';
    }
    
    if (secondDate && isBefore(secondDate, firstDate)) {
      newErrors['secondDueDate'] = 'Debe ser posterior a la primera fecha';
    }
    
    if (thirdDate && secondDate && isBefore(thirdDate, secondDate)) {
      newErrors['thirdDueDate'] = 'Debe ser posterior a la segunda fecha';
    }

    // Validate amounts
    if (!/^\d+(\.\d{1,2})?$/.test(formData.firstAmount)) {
      newErrors['firstAmount'] = 'Formato inválido (ej: 1000.50)';
    }
    if (formData.secondAmount && !/^\d+(\.\d{1,2})?$/.test(formData.secondAmount)) {
      newErrors['secondAmount'] = 'Formato inválido (ej: 1000.50)';
    }
    if (formData.thirdAmount && !/^\d+(\.\d{1,2})?$/.test(formData.thirdAmount)) {
      newErrors['thirdAmount'] = 'Formato inválido (ej: 1000.50)';
    }

    // Validate messages
    if (!formData.ticketMessage || formData.ticketMessage.length > 15) {
      newErrors['ticketMessage'] = 'El mensaje del ticket es requerido (máx. 15 caracteres)';
    } else if (!/^[A-Z0-9\s]*$/.test(formData.ticketMessage)) {
      newErrors['ticketMessage'] = 'Solo letras mayúsculas, números y espacios';
    }

    if (formData.secondaryMessage.length > 25) {
      newErrors['secondaryMessage'] = 'Máximo 25 caracteres';
    } else if (formData.secondaryMessage && !/^[A-Z0-9\s]*$/.test(formData.secondaryMessage)) {
      newErrors['secondaryMessage'] = 'Solo letras mayúsculas, números y espacios';
    }

    if (formData.screenMessage.length > 15) {
      newErrors['screenMessage'] = 'Máximo 15 caracteres';
    } else if (formData.screenMessage && !/^[A-Z0-9\s]*$/.test(formData.screenMessage)) {
      newErrors['screenMessage'] = 'Solo letras mayúsculas, números y espacios';
    }

    // Validate period
    if (!/^\d{2}\d{2}$/.test(formData.period)) {
      newErrors['period'] = 'Formato inválido (MMAA)';
    }

    // Validate concept ID
    if (!/^[0-9]$/.test(formData.conceptId)) {
      newErrors['conceptId'] = 'Debe ser un dígito del 0 al 9';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      generateDebtBase();
    }
  };

  const generateDebtBase = () => {
    const lines: string[] = [];
    const today = format(new Date(), 'yyyyMMdd');
    
    // Generate header
    if (formData.format === 'FULL') {
      // FULL format header
      const header = [
        '0', // Record type
        '400', // Code Banelco
        '0000', // Company code
        today, // File date
        '1' + '0'.repeat(263) // Filler
      ].join('');
      
      if (header.length !== 280) {
        console.error('Invalid header length:', header.length);
        return;
      }
      
      lines.push(header);
    } else {
      // BASIC format header
      const header = [
        'HRFACTURACION', // Record identifier
        '   ', // Entity code (3 spaces)
        format(new Date(), 'yyMMdd'), // Process date (yymmdd)
        '00001', // Batch
        ' '.repeat(104) // Filler
      ].join('');
      
      if (header.length !== 131) {
        console.error('Invalid BASIC header length:', header.length);
        return;
      }
      
      lines.push(header);
    }

    // Generate detail records
    let totalAmount = 0;
    let recordCount = 0;

    formData.conventions.forEach(convention => {
      convention.clients.forEach(client => {
        let receiptNum = '';
        
        if (formData.receiptGeneration === 'AUTOMATIC') {
          // Check if this client ID appears more than once in the same convention
          const clientIdCount = convention.clients.filter(c => c.id === client.id).length;
          
          // If client ID is unique in this convention, use '0' as concept ID, otherwise use the provided one
          const effectiveConceptId = clientIdCount > 1 ? formData.conceptId : '0';
          
          // Generate automatic receipt number with the effective concept ID
          receiptNum = formatReceiptNumber(
            'IDFACTURABASE00',
            effectiveConceptId,
            formData.period,
            formData.format
          );
        } else if (client.receiptNumber) {
          receiptNum = client.receiptNumber;
        }

        if (formData.format === 'FULL') {
          // FULL format detail
          const detail = [
            '5', // Record type
            client.id.padStart(9, '0') + convention.id.padStart(10, '0'), // Reference number (9 client + 10 convention)
            receiptNum.padEnd(20, '0'), // Invoice ID (20 chars)
            '0', // Currency code
            formData.firstDueDate.replace(/-/g, ''), // First due date (YYYYMMDD)
            formatAmount(formData.firstAmount, 11), // First amount (11 chars, 9.2)
            formData.secondDueDate ? formData.secondDueDate.replace(/-/g, '') : formData.firstDueDate.replace(/-/g, ''), // Second due date
            formData.secondAmount ? formatAmount(formData.secondAmount, 11) : formatAmount(formData.firstAmount, 11), // Second amount
            formData.thirdDueDate ? formData.thirdDueDate.replace(/-/g, '') : formData.secondDueDate?.replace(/-/g, '') || formData.firstDueDate.replace(/-/g, ''), // Third due date
            formData.thirdAmount ? formatAmount(formData.thirdAmount, 11) : (formData.secondAmount ? formatAmount(formData.secondAmount, 11) : formatAmount(formData.firstAmount, 11)), // Third amount
            '0'.repeat(19), // Filler 1 (19 zeros)
            client.id.padStart(9, '0') + convention.id.padStart(10, '0'), // Reference repeat
            (formData.ticketMessage.padEnd(15, ' ').substring(0, 15) + 
             (formData.secondaryMessage || '').padEnd(25, ' ').substring(0, 25)).padEnd(40, ' '), // Ticket message (15) + secondary (25)
            formData.screenMessage.padEnd(15, ' ').substring(0, 15), // Screen message (15)
            ' '.repeat(60), // Barcode (60 spaces)
            '0'.repeat(29) // Filler 2 (29 zeros)
          ].join('');
          
          if (detail.length !== 280) {
            console.error('Invalid detail length:', detail.length);
            return;
          }
          
          lines.push(detail);
        } else {
          // BASIC format detail
          const detail = [
            formData.conceptId + formData.period, // Debt ID (concept + period)
            '001', // Concept identifier
            client.id.padStart(9, '0') + convention.id.padStart(10, '0'), // User ID (9 client + 10 convention)
            formData.firstDueDate.replace(/-/g, '').substring(2), // First due date (yymmdd)
            formatAmount(formData.firstAmount, 12), // First amount (12 chars, 10.2)
            formData.secondDueDate ? formData.secondDueDate.replace(/-/g, '').substring(2) : '000000', // Second due date or zeros
            formData.secondAmount ? formatAmount(formData.secondAmount, 12) : '0'.repeat(12), // Second amount or zeros
            formData.thirdDueDate ? formData.thirdDueDate.replace(/-/g, '').substring(2) : '000000', // Third due date or zeros
            formData.thirdAmount ? formatAmount(formData.thirdAmount, 12) : '0'.repeat(12), // Third amount or zeros
            (formData.ticketMessage.padEnd(15, ' ').substring(0, 15) + 
             (formData.secondaryMessage || '').padEnd(25, ' ').substring(0, 25)).padEnd(50, ' ') // Messages (15 + 25) + 10 spaces
          ].join('');
          
          if (detail.length !== 131) {
            console.error('Invalid BASIC detail length:', detail.length);
            return;
          }
          
          lines.push(detail);
        }
        
        totalAmount += parseFloat(formData.firstAmount) || 0;
        recordCount++;
      });
    });

    // Generate footer
    if (formData.format === 'FULL') {
      // FULL format footer
      const footer = [
        '9', // Record type
        '400', // Code Banelco
        '0000', // Company code
        today, // File date
        recordCount.toString().padStart(7, '0'), // Record count
        '0'.repeat(7), // Filler
        formatAmount(totalAmount.toString(), 16), // Total amount (16 chars, 14.2)
        '0'.repeat(234) // Filler
      ].join('');
      
      if (footer.length !== 280) {
        console.error('Invalid footer length:', footer.length);
        return;
      }
      
      lines.push(footer);
    } else {
      // BASIC format footer
      const footer = [
        'TRFACTURACION', // Record identifier
        (recordCount + 2).toString().padStart(8, '0'), // Record count (details + header + footer)
        formatAmount(totalAmount.toString(), 18), // Total first amount (18 chars, 16.2)
        formatAmount((parseFloat(formData.secondAmount || '0') * recordCount).toString(), 18), // Total second amount
        formatAmount((parseFloat(formData.thirdAmount || '0') * recordCount).toString(), 18), // Total third amount
        ' '.repeat(56) // Filler
      ].join('');
      
      if (footer.length !== 131) {
        console.error('Invalid BASIC footer length:', footer.length);
        return;
      }
      
      lines.push(footer);
    }

    setDebtBaseContent(lines.join('\n'));
  };

  const formatAmount = (amount: string, length: number): string => {
    const [integer, decimal = '00'] = amount.split('.');
    const paddedInteger = integer.padStart(length - 2, '0');
    const paddedDecimal = decimal.padEnd(2, '0').substring(0, 2);
    return (paddedInteger + paddedDecimal).substring(0, length);
  };

  const handleDownload = () => {
    if (!debtBaseContent) return;
    
    const blob = new Blob([debtBaseContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base_deuda_${format(new Date(), 'yyyyMMdd')}.txt`;
    document.body.appendChild(a);
  };

  const addConvention = () => {
    setFormData(prev => ({
      ...prev,
      conventions: [...prev.conventions, { ...initialConvention }]
    }));
  };

  const removeConvention = (index: number) => {
    if (formData.conventions.length > 1) {
      const newConventions = [...formData.conventions];
      newConventions.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        conventions: newConventions
      }));
    }
  };

  const updateConvention = (index: number, field: keyof Convention, value: string) => {
    const newConventions = [...formData.conventions];
    newConventions[index] = { ...newConventions[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      conventions: newConventions
    }));
  };

  const updateField = (field: keyof Omit<DebtBaseFormData, 'conventions'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--siro-green)] mb-4">
          Generador de Base de Deuda
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Complete el formulario para generar una nueva base de deuda con los parámetros especificados.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Formato de Base de Deuda</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-[var(--siro-green)]"
                checked={formData.format === 'FULL'}
                onChange={() => updateField('format', 'FULL')}
              />
              <span className="ml-2">FULL (280 caracteres)</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-[var(--siro-green)]"
                checked={formData.format === 'BASIC'}
                onChange={() => updateField('format', 'BASIC')}
              />
              <span className="ml-2">Básico (131 caracteres)</span>
            </label>
          </div>
        </div>

        {/* Conventions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Convenios</label>
          {formData.conventions.map((convention, index) => (
            <div key={index} className="flex space-x-4 mb-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Convenio</label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border ${errors[`convention-${index}-id`] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                  value={convention.id}
                  onChange={(e) => updateConvention(index, 'id', e.target.value)}
                  placeholder="Ingrese ID de convenio (10 dígitos)"
                  maxLength={10}
                />
                {errors[`convention-${index}-id`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`convention-${index}-id`]}</p>
                )}
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border ${errors[`convention-${index}-count`] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                  value={convention.recordCount}
                  onChange={(e) => updateConvention(index, 'recordCount', e.target.value)}
                  placeholder="Ej: 1"
                />
                {errors[`convention-${index}-count`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`convention-${index}-count`]}</p>
                )}
              </div>
              {formData.conventions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeConvention(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  -
                </button>
              )}
              {index === formData.conventions.length - 1 && (
                <button
                  type="button"
                  onClick={addConvention}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Due Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Vencimiento</label>
            <input
              type="date"
              className={`w-full px-3 py-2 border ${errors['firstDueDate'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.firstDueDate}
              min={today}
              onChange={(e) => updateField('firstDueDate', e.target.value)}
            />
            {errors['firstDueDate'] && (
              <p className="mt-1 text-sm text-red-600">{errors['firstDueDate']}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Vencimiento (opcional)</label>
            <input
              type="date"
              className={`w-full px-3 py-2 border ${errors['secondDueDate'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.secondDueDate}
              min={formData.firstDueDate || today}
              onChange={(e) => updateField('secondDueDate', e.target.value)}
              disabled={!formData.firstDueDate}
            />
            {errors['secondDueDate'] && (
              <p className="mt-1 text-sm text-red-600">{errors['secondDueDate']}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tercer Vencimiento (opcional)</label>
            <input
              type="date"
              className={`w-full px-3 py-2 border ${errors['thirdDueDate'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.thirdDueDate}
              min={formData.secondDueDate || formData.firstDueDate || today}
              onChange={(e) => updateField('thirdDueDate', e.target.value)}
              disabled={!formData.secondDueDate}
            />
            {errors['thirdDueDate'] && (
              <p className="mt-1 text-sm text-red-600">{errors['thirdDueDate']}</p>
            )}
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Importe</label>
            <input
              type="text"
              className={`w-full px-3 py-2 border ${errors['firstAmount'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.firstAmount}
              onChange={(e) => updateField('firstAmount', e.target.value)}
              placeholder="Ej: 1000.50"
            />
            {errors['firstAmount'] && (
              <p className="mt-1 text-sm text-red-600">{errors['firstAmount']}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Importe (opcional)</label>
            <input
              type="text"
              className={`w-full px-3 py-2 border ${errors['secondAmount'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.secondAmount}
              onChange={(e) => updateField('secondAmount', e.target.value)}
              placeholder="Ej: 1050.25"
              disabled={!formData.secondDueDate}
            />
            {errors['secondAmount'] && (
              <p className="mt-1 text-sm text-red-600">{errors['secondAmount']}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tercer Importe (opcional)</label>
            <input
              type="text"
              className={`w-full px-3 py-2 border ${errors['thirdAmount'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.thirdAmount}
              onChange={(e) => updateField('thirdAmount', e.target.value)}
              placeholder="Ej: 1100.75"
              disabled={!formData.thirdDueDate}
            />
            {errors['thirdAmount'] && (
              <p className="mt-1 text-sm text-red-600">{errors['thirdAmount']}</p>
            )}
          </div>
        </div>

        {/* Message Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje 1 (15 caracteres)</label>
            <input
              type="text"
              className={`w-full px-3 py-2 border ${errors['ticketMessage'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.ticketMessage}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '').substring(0, 15);
                updateField('ticketMessage', value);
              }}
              maxLength={15}
              placeholder="Máx. 15 caracteres"
            />
            {errors['ticketMessage'] && (
              <p className="mt-1 text-sm text-red-600">{errors['ticketMessage']}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje 2 (25 caracteres)</label>
            <input
              type="text"
              className={`w-full px-3 py-2 border ${errors['secondaryMessage'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.secondaryMessage}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '').substring(0, 25);
                updateField('secondaryMessage', value);
              }}
              maxLength={25}
              placeholder="Máx. 25 caracteres"
            />
            {errors['secondaryMessage'] && (
              <p className="mt-1 text-sm text-red-600">{errors['secondaryMessage']}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje 3 (15 caracteres)</label>
            <input
              type="text"
              className={`w-full px-3 py-2 border ${errors['screenMessage'] ? 'border-red-500' : 'border-gray-300'} rounded-md`}
              value={formData.screenMessage}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '').substring(0, 15);
                updateField('screenMessage', value);
              }}
              maxLength={15}
              placeholder="Máx. 15 caracteres"
            />
            {errors['screenMessage'] && (
              <p className="mt-1 text-sm text-red-600">{errors['screenMessage']}</p>
            )}
          </div>
        </div>

        {/* Client ID Generation */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Generación de Id clientes</h3>
          <div className="flex items-center justify-between">
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="clientIdGeneration"
                  className="form-radio h-5 w-5 text-[var(--siro-green)]"
                  checked={formData.clientIdGeneration === 'MANUAL'}
                  onChange={() => updateField('clientIdGeneration', 'MANUAL')}
                />
                <span>Ingreso manual</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="clientIdGeneration"
                  className="form-radio h-5 w-5 text-[var(--siro-green)]"
                  checked={formData.clientIdGeneration === 'AUTOMATIC'}
                  onChange={() => updateField('clientIdGeneration', 'AUTOMATIC')}
                />
                <span>Generación automática</span>
              </label>
            </div>
            <button
              type="button"
              onClick={generateClientIds}
              disabled={formData.clientIdGeneration !== 'AUTOMATIC'}
              className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                formData.clientIdGeneration === 'AUTOMATIC'
                  ? 'bg-[var(--siro-green)] hover:bg-[#055a2e] cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Generar IDs
            </button>
          </div>
        </div>

        {/* Receipt Generation Options */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Generación de comprobantes</h3>
          <div className="flex items-center justify-between">
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="receiptGeneration"
                  className="form-radio h-5 w-5 text-[var(--siro-green)]"
                  checked={formData.receiptGeneration === 'MANUAL'}
                  onChange={() => updateField('receiptGeneration', 'MANUAL')}
                />
                <span>Ingreso manual</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="receiptGeneration"
                  className="form-radio h-5 w-5 text-[var(--siro-green)]"
                  checked={formData.receiptGeneration === 'AUTOMATIC'}
                  onChange={() => updateField('receiptGeneration', 'AUTOMATIC')}
                />
                <span>Generación automática</span>
              </label>
            </div>
            <button
              type="button"
              onClick={generateReceipts}
              disabled={!isFormReady}
              className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                isFormReady
                  ? 'bg-[var(--siro-green)] hover:bg-[#055a2e] cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Generar
            </button>
          </div>
        </div>

        {/* ID CLIENTE Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">ID CLIENTE</h3>
          <div className="space-y-6">
            {formData.conventions.map((convention, convIndex) => (
              <div key={`conv-${convIndex}`} className="border rounded-lg p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Convenio: {convention.id} (Cantidad: {convention.recordCount})
                  </label>
                  <div className="space-y-3">
                    {Array.from({ length: parseInt(convention.recordCount) || 0 }).map((_, clientIndex) => (
                      <div key={`client-${convIndex}-${clientIndex}`} className="w-full flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            ID Cliente {clientIndex + 1}
                          </label>
                          <input
                            type="text"
                            className={`w-full px-3 py-2 border ${
                              errors[`client-${convIndex}-${clientIndex}-id`] 
                                ? 'border-red-500' 
                                : 'border-gray-300'
                            } rounded-md`}
                            value={convention.clients[clientIndex]?.id || ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').substring(0, 9);
                              const newConventions = [...formData.conventions];
                              if (!newConventions[convIndex].clients[clientIndex]) {
                                newConventions[convIndex].clients[clientIndex] = { ...initialClient };
                              }
                              newConventions[convIndex].clients[clientIndex].id = value;
                              setFormData(prev => ({
                                ...prev,
                                conventions: newConventions
                              }));
                            }}
                            placeholder="123456789"
                            maxLength={9}
                          />
                          {errors[`client-${convIndex}-${clientIndex}-id`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[`client-${convIndex}-${clientIndex}-id`]}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Comprobante
                          </label>
                          {formData.receiptGeneration === 'AUTOMATIC' ? (
                            <div className="px-3 py-2 bg-gray-100 rounded-md border border-gray-300 min-h-[42px]">
                              {convention.clients[clientIndex]?.receiptNumber || ''}
                            </div>
                          ) : (
                            <>
                              <input
                                type="text"
                                className={`w-full px-3 py-2 border ${
                                  errors[`client-${convIndex}-${clientIndex}-receipt`] 
                                    ? 'border-red-500' 
                                    : 'border-gray-300'
                                } rounded-md`}
                                value={convention.clients[clientIndex]?.receiptNumber || ''}
                                onChange={(e) => {
                                  const value = formData.format === 'BASIC' 
                                    ? e.target.value.replace(/\D/g, '').substring(0, 5)
                                    : e.target.value.substring(0, 20);
                                  
                                  const newConventions = [...formData.conventions];
                                  if (!newConventions[convIndex].clients[clientIndex]) {
                                    newConventions[convIndex].clients[clientIndex] = { ...initialClient };
                                  }
                                  newConventions[convIndex].clients[clientIndex].receiptNumber = value;
                                  
                                  setFormData(prev => ({
                                    ...prev,
                                    conventions: newConventions
                                  }));
                                }}
                                placeholder={
                                  formData.format === 'BASIC' 
                                    ? '5 dígitos' 
                                    : '15 caracteres alfanum + 5 dígitos'
                                }
                                maxLength={formData.format === 'BASIC' ? 5 : 20}
                              />
                              {errors[`client-${convIndex}-${clientIndex}-receipt`] && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors[`client-${convIndex}-${clientIndex}-receipt`]}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--siro-green)] text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Generar Base de Deuda
          </button>
        </div>

        {/* Preview Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Previsualización</h3>
          <div className="bg-white p-4 rounded-md border border-gray-300">
            {debtBaseContent ? (
              <div className="space-y-4">
                <div className="font-mono text-sm bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-96">
                  {formData.format === 'FULL' ? (
                    <pre className="whitespace-pre">{debtBaseContent}</pre>
                  ) : (
                    <pre className="whitespace-pre">
                      {debtBaseContent.split('\n').map((line, i) => (
                        <div key={i} className="font-mono text-sm">
                          {line}
                        </div>
                      ))}
                    </pre>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {debtBaseContent.split('\n').length} registros generados
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (debtBaseContent) {
                        const blob = new Blob([debtBaseContent], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `base_deuda_${formData.format.toLowerCase()}_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="px-4 py-2 bg-[var(--siro-green)] text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar Base
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-center py-8 bg-gray-50 rounded">
                La previsualización de la base de deuda aparecerá aquí después de generarla
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
