import { SiroField, SiroHeaderRecord, SiroDetailRecord, SiroFooterRecord, SiroParsedFile } from '@/types/siro';

// Field definitions for SIRO format
export const HEADER_FIELDS: SiroField[] = [
  { name: 'Código Registro', position: [1, 1], length: 1, type: 'numeric', description: 'Código Registro (0)' },
  { name: 'Código Banelco', position: [2, 4], length: 3, type: 'numeric', description: 'Código Banelco (400)' },
  { name: 'Código Empresa', position: [5, 8], length: 4, type: 'numeric', description: 'Código Empresa (0000)' },
  { name: 'Fecha Archivo', position: [9, 16], length: 8, type: 'numeric', description: 'Fecha Archivo AAAAMMDD' },
  { name: 'Filler', position: [17, 280], length: 264, type: 'alphanumeric', description: 'Filler (17=1, resto=0)' }
];

export const DETAIL_FIELDS: SiroField[] = [
  { name: 'Código Registro', position: [1, 1], length: 1, type: 'numeric', description: 'Código Registro (5)' },
  { name: 'Nro. Referencia', position: [2, 20], length: 19, type: 'numeric', description: 'Nro. Referencia' },
  { name: 'ID Factura', position: [21, 40], length: 20, type: 'alphanumeric', description: 'ID Factura' },
  { name: 'Código Moneda', position: [41, 41], length: 1, type: 'numeric', description: 'Código Moneda (0)' },
  { name: 'Fecha 1° Venc.', position: [42, 49], length: 8, type: 'numeric', description: 'Fecha 1° Vencimiento' },
  { name: 'Importe 1° Venc.', position: [50, 60], length: 11, type: 'numeric', description: 'Importe 1° Vencimiento' },
  { name: 'Fecha 2° Venc.', position: [61, 68], length: 8, type: 'numeric', description: 'Fecha 2° Vencimiento' },
  { name: 'Importe 2° Venc.', position: [69, 79], length: 11, type: 'numeric', description: 'Importe 2° Vencimiento' },
  { name: 'Fecha 3° Venc.', position: [80, 87], length: 8, type: 'numeric', description: 'Fecha 3° Vencimiento' },
  { name: 'Importe 3° Venc.', position: [88, 98], length: 11, type: 'numeric', description: 'Importe 3° Vencimiento' },
  { name: 'Filler 1', position: [99, 117], length: 19, type: 'numeric', description: 'Filler 1 (ceros)' },
  { name: 'Nro. Ref. Anterior', position: [118, 136], length: 19, type: 'alphanumeric', description: 'Nro. Referencia Ant.' },
  { name: 'Mensaje Ticket', position: [137, 176], length: 40, type: 'alphanumeric', description: 'Mensaje Ticket' },
  { name: 'Mensaje Pantalla', position: [177, 191], length: 15, type: 'alphanumeric', description: 'Mensaje Pantalla' },
  { name: 'Código Barras', position: [192, 251], length: 60, type: 'alphanumeric', description: 'Código de Barras' },
  { name: 'Filler 2', position: [252, 280], length: 29, type: 'numeric', description: 'Filler 2 (ceros)' }
];

export const FOOTER_FIELDS: SiroField[] = [
  { name: 'Código Registro', position: [1, 1], length: 1, type: 'numeric', description: 'Código Registro (9)' },
  { name: 'Código Banelco', position: [2, 4], length: 3, type: 'numeric', description: 'Código Banelco (400)' },
  { name: 'Código Empresa', position: [5, 8], length: 4, type: 'numeric', description: 'Código Empresa (0000)' },
  { name: 'Fecha Archivo', position: [9, 16], length: 8, type: 'numeric', description: 'Fecha Archivo AAAAMMDD' },
  { name: 'Cant. Registros', position: [17, 23], length: 7, type: 'numeric', description: 'Cantidad Registros' },
  { name: 'Filler 1', position: [24, 30], length: 7, type: 'numeric', description: 'Filler 1 (ceros)' },
  { name: 'Total Importe', position: [31, 46], length: 16, type: 'numeric', description: 'Total Importe' },
  { name: 'Filler 2', position: [47, 280], length: 234, type: 'numeric', description: 'Filler 2 (ceros)' }
];

export class SiroFileParser {
  static parseField(line: string, field: SiroField): string {
    const start = field.position[0] - 1; // Convert to 0-based index
    const end = field.position[1];
    return line.substring(start, end).trim();
  }

  static parseHeaderRecord(line: string): SiroHeaderRecord {
    return {
      recordType: this.parseField(line, HEADER_FIELDS[0]),
      banelcoCode: this.parseField(line, HEADER_FIELDS[1]),
      companyCode: this.parseField(line, HEADER_FIELDS[2]),
      fileDate: this.parseField(line, HEADER_FIELDS[3]),
      filler: this.parseField(line, HEADER_FIELDS[4])
    };
  }

  static parseDetailRecord(line: string): SiroDetailRecord {
    return {
      recordType: this.parseField(line, DETAIL_FIELDS[0]),
      referenceNumber: this.parseField(line, DETAIL_FIELDS[1]),
      invoiceId: this.parseField(line, DETAIL_FIELDS[2]),
      currencyCode: this.parseField(line, DETAIL_FIELDS[3]),
      firstDueDate: this.parseField(line, DETAIL_FIELDS[4]),
      firstAmount: this.parseField(line, DETAIL_FIELDS[5]),
      secondDueDate: this.parseField(line, DETAIL_FIELDS[6]),
      secondAmount: this.parseField(line, DETAIL_FIELDS[7]),
      thirdDueDate: this.parseField(line, DETAIL_FIELDS[8]),
      thirdAmount: this.parseField(line, DETAIL_FIELDS[9]),
      filler1: this.parseField(line, DETAIL_FIELDS[10]),
      referenceRepeat: this.parseField(line, DETAIL_FIELDS[11]),
      ticketMessage: this.parseField(line, DETAIL_FIELDS[12]),
      screenMessage: this.parseField(line, DETAIL_FIELDS[13]),
      barcode: this.parseField(line, DETAIL_FIELDS[14]),
      filler2: this.parseField(line, DETAIL_FIELDS[15])
    };
  }

  static parseFooterRecord(line: string): SiroFooterRecord {
    return {
      recordType: this.parseField(line, FOOTER_FIELDS[0]),
      banelcoCode: this.parseField(line, FOOTER_FIELDS[1]),
      companyCode: this.parseField(line, FOOTER_FIELDS[2]),
      fileDate: this.parseField(line, FOOTER_FIELDS[3]),
      recordCount: this.parseField(line, FOOTER_FIELDS[4]),
      filler1: this.parseField(line, FOOTER_FIELDS[5]),
      totalAmount: this.parseField(line, FOOTER_FIELDS[6]),
      filler2: this.parseField(line, FOOTER_FIELDS[7])
    };
  }

  static async parseFile(file: File): Promise<SiroParsedFile> {
    const content = await this.readFileContent(file);
    const lines = content.split('\n').map(line => line.replace('\r', ''));
    
    const result: SiroParsedFile = {
      fileName: file.name,
      header: null,
      details: [],
      footer: null,
      totalRecords: lines.length,
      errors: []
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.length === 0) continue;
      
      if (line.length !== 280) {
        result.errors.push(`Línea ${i + 1}: Longitud incorrecta (${line.length} caracteres, esperados 280)`);
        continue;
      }

      const recordType = line.charAt(0);
      
      try {
        switch (recordType) {
          case '0':
            if (result.header) {
              result.errors.push(`Línea ${i + 1}: Múltiples registros de cabecera encontrados`);
            } else {
              result.header = this.parseHeaderRecord(line);
            }
            break;
          case '5':
            result.details.push(this.parseDetailRecord(line));
            break;
          case '9':
            if (result.footer) {
              result.errors.push(`Línea ${i + 1}: Múltiples registros de pie encontrados`);
            } else {
              result.footer = this.parseFooterRecord(line);
            }
            break;
          default:
            result.errors.push(`Línea ${i + 1}: Tipo de registro desconocido '${recordType}'`);
        }
      } catch (error) {
        result.errors.push(`Línea ${i + 1}: Error al procesar registro - ${error}`);
      }
    }

    return result;
  }

  private static readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'utf-8');
    });
  }
}
