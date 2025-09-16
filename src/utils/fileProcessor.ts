import { FileRecord, ValidationResult, ValidationRule } from '@/types';

export class FileProcessor {
  static parseTextFile(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  static validateRecords(
    records: string[],
    validationRules: ValidationRule[]
  ): FileRecord[] {
    return records.map((record, index) => {
      const errors: string[] = [];
      let isValid = true;

      validationRules.forEach(rule => {
        const result = rule.validate(record);
        if (!result.isValid) {
          isValid = false;
          errors.push(...result.errors);
        }
      });

      return {
        id: `record-${index + 1}`,
        lineNumber: index + 1,
        content: record,
        isValid,
        errors
      };
    });
  }

  static async processFile(
    file: File,
    validationRules: ValidationRule[]
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    const content = await this.readFileContent(file);
    const records = this.parseTextFile(content);
    const validatedRecords = this.validateRecords(records, validationRules);
    
    const validRecords = validatedRecords.filter(r => r.isValid).length;
    const invalidRecords = validatedRecords.length - validRecords;
    
    return {
      fileName: file.name,
      totalRecords: validatedRecords.length,
      validRecords,
      invalidRecords,
      records: validatedRecords,
      processingTime: Date.now() - startTime
    };
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
