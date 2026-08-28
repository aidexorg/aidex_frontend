/** Minimal RFC4180-style CSV parser (no external dependency). */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvParseError';
  }
}

export function parseCsv(text: string): ParsedCsv {
  const content = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!content.trim()) {
    throw new CsvParseError('empty');
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '') || rows.length === 0) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '') || rows.length === 0) {
      rows.push(row);
    }
  }

  if (inQuotes) {
    throw new CsvParseError('unclosed_quote');
  }

  if (rows.length === 0) {
    throw new CsvParseError('empty');
  }

  const headers = rows[0].map((h) => h.trim());
  if (headers.every((h) => !h)) {
    throw new CsvParseError('no_headers');
  }

  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== ''));
  return { headers, rows: dataRows };
}
