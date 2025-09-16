'use client';

import { useState } from 'react';
import { SiroParsedFile } from '@/types/siro';
import { SiroFileParser } from '@/utils/siroParser';
import FileUpload from './FileUpload';
import SiroTable from './SiroTable';

export default function SiroParserTab() {
  const [parsedFile, setParsedFile] = useState<SiroParsedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (uploadedFile: { file: File; content: string; uploadedAt: Date }) => {
    setIsProcessing(true);
    
    try {
      const result = await SiroFileParser.parseFile(uploadedFile.file);
      setParsedFile(result);
    } catch (error) {
      console.error('Error parsing SIRO file:', error);
      alert('Error al procesar el archivo SIRO');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--siro-green)] mb-4">
          Analizador de Archivos SIRO
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Carga un archivo TXT con formato SIRO para analizar su estructura. 
          El archivo debe contener registros de 280 caracteres con cabecera (tipo 0), 
          detalles (tipo 5) y pie (tipo 9).
        </p>
      </div>

      <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
      
      <SiroTable parsedFile={parsedFile} />
    </div>
  );
}
