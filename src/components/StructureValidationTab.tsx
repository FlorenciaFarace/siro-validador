'use client';

import { useState } from 'react';
import { UploadedFile, ValidationResult } from '@/types';
import { FileProcessor } from '@/utils/fileProcessor';
import { structureValidationRules } from '@/utils/validationRules';
import FileUpload from './FileUpload';
import ValidationResults from './ValidationResults';

export default function StructureValidationTab() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file: UploadedFile) => {
    setUploadedFile(file);
    setIsProcessing(true);
    
    try {
      const result = await FileProcessor.processFile(file.file, structureValidationRules);
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
          Validación de Estructura
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Valida la estructura de los registros, verificando formatos CSV, 
          separadores específicos y la cantidad correcta de campos.
        </p>
      </div>

      <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
      
      <ValidationResults result={validationResult} />
    </div>
  );
}
