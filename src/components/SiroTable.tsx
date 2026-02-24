'use client';

import { SiroParsedFile, SiroHeaderRecord, SiroDetailRecord, SiroFooterRecord } from '@/types/siro';
import { HEADER_FIELDS, DETAIL_FIELDS, FOOTER_FIELDS } from '@/utils/siroParser';

interface SiroTableProps {
  parsedFile: SiroParsedFile | null;
}

export default function SiroTable({ parsedFile }: SiroTableProps) {
  if (!parsedFile) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📊</div>
        <p>Carga un archivo SIRO para ver la estructura de registros</p>
      </div>
    );
  }

  const renderHeaderTable = (header: SiroHeaderRecord) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[var(--siro-green)] mb-4">
        Cabecera
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Longitud</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {HEADER_FIELDS.map((field, index) => (
              <tr key={field.name}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{field.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{field.position[0]}-{field.position[1]}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{field.length}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-mono bg-gray-50">
                  {Object.values(header)[index] || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{field.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  interface TableField {
    name: string;
  }

  const getColumnWidth = (field: TableField) => {
    // Define custom widths based on field types and expected content
    const widthMap: { [key: string]: string } = {
      'Código Registro': 'w-20',
      'Nro. Referencia': 'w-40',
      'ID Factura': 'w-44',
      'Código Moneda': 'w-20',
      'Fecha 1° Venc.': 'w-28',
      'Importe 1° Venc.': 'w-32',
      'Fecha 2° Venc.': 'w-28',
      'Importe 2° Venc.': 'w-32',
      'Fecha 3° Venc.': 'w-28',
      'Importe 3° Venc.': 'w-32',
      'Filler 1': 'w-24',
      'Nro. Ref. Anterior': 'w-40',
      'Mensaje Ticket': 'w-60',
      'Mensaje Pantalla': 'w-36',
      'Código Barras': 'w-72',
      'Filler 2': 'w-24'
    };
    
    return widthMap[field.name] || 'w-32';
  };

  const renderDetailTable = (details: SiroDetailRecord[]) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[var(--siro-green)] mb-4">
        Detalle ({details.length} registros)
      </h3>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="bg-white">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16 border-r border-gray-200">
                #
              </th>
              {DETAIL_FIELDS.map((field, index) => (
                <th 
                  key={field.name} 
                  className={`px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 ${getColumnWidth(field)}`}
                >
                  <span className="font-semibold">{field.name} ({field.position[0]}-{field.position[1]}) L:{field.length}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {details.map((detail, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                  {rowIndex + 1}
                </td>
                {DETAIL_FIELDS.map((field, fieldIndex) => (
                  <td 
                    key={field.name} 
                    className={`px-2 py-2 text-sm text-gray-900 font-mono border-r border-gray-200 ${getColumnWidth(field)}`}
                  >
                    <div 
                      className="truncate" 
                      title={Object.values(detail)[fieldIndex] || '-'}
                    >
                      {Object.values(detail)[fieldIndex] || '-'}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFooterTable = (footer: SiroFooterRecord) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-[var(--siro-green)] mb-4">
        Pie
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Longitud</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {FOOTER_FIELDS.map((field, index) => (
              <tr key={field.name}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{field.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{field.position[0]}-{field.position[1]}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{field.length}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-mono bg-gray-50">
                  {Object.values(footer)[index] || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{field.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderErrors = (errors: string[]) => {
    if (errors.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
          <span className="bg-red-500 text-white px-2 py-1 rounded text-sm mr-2">ERRORES</span>
          {errors.length} errores encontrados
        </h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-red-700 text-sm">{error}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* File Summary */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 max-w-sm mx-auto">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[var(--siro-orange)]">
          <div className="text-2xl font-bold text-[var(--siro-orange)]">
            {parsedFile.details.length}
          </div>
          <div className="text-sm text-gray-600">Registros</div>
        </div>
      </div>

      {/* Errors */}
      {renderErrors(parsedFile.errors)}

      {/* Tables */}
      {parsedFile.header && renderHeaderTable(parsedFile.header)}
      {parsedFile.details.length > 0 && renderDetailTable(parsedFile.details)}
      {parsedFile.footer && renderFooterTable(parsedFile.footer)}
    </div>
  );
}
