'use client';

import { useState } from 'react';
import { UploadedFile, ValidationResult } from '@/types';
import { FileProcessor } from '@/utils/fileProcessor';
import { formatValidationRules } from '@/utils/validationRules';
import FileUpload from './FileUpload';
import ValidationResults from './ValidationResults';

export default function FormatValidationTab() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file: UploadedFile) => {
    setUploadedFile(file);
    setIsProcessing(true);
    
    try {
      const result = await FileProcessor.processFile(file.file, formatValidationRules);
      setValidationResult(result);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error al procesar el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--siro-green)] mb-4">
          Validación de Formato
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Valida el formato de los registros, verificando si contienen solo números, 
          solo caracteres alfanuméricos, o siguen patrones específicos.
        </p>
      </div>

      <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
      
      <ValidationResults result={validationResult} />
    </div>
  );
}
