'use client';

import { ValidationResult } from '@/types';

interface ValidationResultsProps {
  result: ValidationResult | null;
}

export default function ValidationResults({ result }: ValidationResultsProps) {
  if (!result) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📊</div>
        <p>Carga un archivo para ver los resultados de validación</p>
      </div>
    );
  }

  const successRate = result.totalRecords > 0 
    ? Math.round((result.validRecords / result.totalRecords) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[var(--siro-green)]">
          <div className="text-2xl font-bold text-[var(--siro-green)]">
            {result.totalRecords}
          </div>
          <div className="text-sm text-gray-600">Total de registros</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">
            {result.validRecords}
          </div>
          <div className="text-sm text-gray-600">Registros válidos</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">
            {result.invalidRecords}
          </div>
          <div className="text-sm text-gray-600">Registros inválidos</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[var(--siro-orange)]">
          <div className="text-2xl font-bold text-[var(--siro-orange)]">
            {successRate}%
          </div>
          <div className="text-sm text-gray-600">Tasa de éxito</div>
        </div>
      </div>

      {/* File Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-[var(--siro-green)] mb-4">
          Información del archivo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Nombre:</span> {result.fileName}
          </div>
          <div>
            <span className="font-medium">Tiempo de procesamiento:</span> {result.processingTime}ms
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-[var(--siro-green)] mb-4">
          Progreso de validación
        </h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-green-500 to-[var(--siro-green)] h-4 rounded-full transition-all duration-500"
            style={{ width: `${successRate}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {result.validRecords} de {result.totalRecords} registros son válidos
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[var(--siro-green)]">
            Detalle de registros
          </h3>
        </div>
        
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Línea
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contenido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Errores
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {result.records.map((record) => (
                <tr key={record.id} className={record.isValid ? '' : 'bg-red-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.lineNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {record.content}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.isValid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.isValid ? 'Válido' : 'Inválido'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600">
                    {record.errors.length > 0 && (
                      <ul className="list-disc list-inside">
                        {record.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
