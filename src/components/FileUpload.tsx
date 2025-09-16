'use client';

import { useState, useRef } from 'react';
import { UploadedFile } from '@/types';

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  isProcessing: boolean;
}

export default function FileUpload({ onFileUpload, isProcessing }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      alert('Por favor, selecciona un archivo de texto (.txt)');
      return;
    }

    try {
      const content = await readFileContent(file);
      const uploadedFile: UploadedFile = {
        file,
        content,
        uploadedAt: new Date()
      };
      onFileUpload(uploadedFile);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error al leer el archivo');
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'utf-8');
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragActive 
            ? 'border-[var(--siro-green)] bg-[var(--siro-light-gray)]' 
            : 'border-gray-300 hover:border-[var(--siro-green)]'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          <div className="text-6xl text-[var(--siro-green)]">📄</div>
          
          <div>
            <h3 className="text-lg font-semibold text-[var(--siro-green)] mb-2">
              {isProcessing ? 'Procesando archivo...' : 'Cargar archivo TXT'}
            </h3>
            <p className="text-gray-600">
              Arrastra y suelta tu archivo aquí o haz clic para seleccionar
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            Formatos soportados: .txt
          </div>
        </div>
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--siro-green)]"></div>
          </div>
        )}
      </div>
    </div>
  );
}
