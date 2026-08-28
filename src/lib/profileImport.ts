import type { Profile } from '@/types';
import type { ProfileWrite } from '@/data/types';
import type { MessageKey } from '@/i18n/messages';

export type ImportFieldKey = keyof ProfileWrite;

export const IMPORT_FIELDS: ImportFieldKey[] = [
  'first_name',
  'last_name',
  'birth_year',
  'phone',
  'address',
  'clinical_notes',
  'file_number',
  'national_id',
  'file_description',
];

export const REQUIRED_IMPORT_FIELDS: ImportFieldKey[] = ['first_name', 'last_name'];

const HEADER_ALIASES: Record<ImportFieldKey, string[]> = {
  first_name: ['first_name', 'firstname', 'first name', 'fname', 'name', 'نام', 'نام کوچک'],
  last_name: ['last_name', 'lastname', 'last name', 'lname', 'surname', 'family name', 'نام خانوادگی'],
  birth_year: ['birth_year', 'birthyear', 'birth year', 'year', 'سال تولد', 'تولد'],
  phone: ['phone', 'mobile', 'tel', 'telephone', 'تلفن', 'موبایل', 'شماره تماس'],
  address: ['address', 'addr', 'آدرس'],
  clinical_notes: ['clinical_notes', 'notes', 'clinical notes', 'یادداشت', 'یادداشت بالینی'],
  file_number: ['file_number', 'file number', 'file no', 'fileno', 'شماره پرونده', 'پرونده'],
  national_id: ['national_id', 'national id', 'nationalid', 'nid', 'کد ملی', 'کدملی'],
  file_description: ['file_description', 'description', 'file desc', 'توضیحات', 'توضیحات پرونده'],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ').replace(/_/g, ' ');
}

export function autoMapColumns(headers: string[]): Partial<Record<ImportFieldKey, string>> {
  const mapping: Partial<Record<ImportFieldKey, string>> = {};
  const used = new Set<string>();

  for (const field of IMPORT_FIELDS) {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader);
    const match = headers.find((h) => {
      const norm = normalizeHeader(h);
      return !used.has(h) && aliases.includes(norm);
    });
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }

  return mapping;
}

export type ColumnMapping = Partial<Record<ImportFieldKey, string | null>>;

function cellValue(row: string[], headers: string[], column: string | null | undefined): string {
  if (!column) return '';
  const index = headers.indexOf(column);
  if (index < 0) return '';
  return (row[index] ?? '').trim();
}

function nullable(value: string): string | null {
  return value ? value : null;
}

export function rowToProfileWrite(
  row: string[],
  headers: string[],
  mapping: ColumnMapping,
): ProfileWrite {
  const get = (field: ImportFieldKey) => cellValue(row, headers, mapping[field] ?? null);
  return {
    first_name: get('first_name'),
    last_name: get('last_name'),
    birth_year: nullable(get('birth_year')),
    phone: nullable(get('phone')),
    address: nullable(get('address')),
    clinical_notes: nullable(get('clinical_notes')),
    file_number: nullable(get('file_number')),
    national_id: nullable(get('national_id')),
    file_description: nullable(get('file_description')),
  };
}

export type RowImportStatus = 'valid' | 'warning' | 'error' | 'duplicate';

export interface ValidatedImportRow {
  rowIndex: number;
  data: ProfileWrite;
  status: RowImportStatus;
  messageKeys: MessageKey[];
}

function duplicateKey(data: ProfileWrite): string | null {
  const nid = data.national_id?.trim();
  if (nid) return `nid:${nid.replace(/\D/g, '')}`;
  const phone = data.phone?.trim();
  if (phone) return `phone:${phone.replace(/\D/g, '')}`;
  const file = data.file_number?.trim();
  if (file) return `file:${file.toLowerCase()}`;
  return null;
}

function buildExistingKeys(profiles: Profile[]): Set<string> {
  const keys = new Set<string>();
  for (const p of profiles) {
    const key = duplicateKey({
      first_name: p.first_name,
      last_name: p.last_name,
      birth_year: p.birth_year,
      phone: p.phone,
      address: p.address,
      clinical_notes: p.clinical_notes,
      file_number: p.file_number,
      national_id: p.national_id,
      file_description: p.file_description,
    });
    if (key) keys.add(key);
  }
  return keys;
}

const PHONE_RE = /^[\d+\-\s()]{7,20}$/;

export function validateImportRows(
  rows: string[][],
  headers: string[],
  mapping: ColumnMapping,
  existingProfiles: Profile[],
): ValidatedImportRow[] {
  const existingKeys = buildExistingKeys(existingProfiles);
  const batchKeys = new Set<string>();
  const result: ValidatedImportRow[] = [];

  rows.forEach((row, index) => {
    const data = rowToProfileWrite(row, headers, mapping);
    const messageKeys: MessageKey[] = [];
    let status: RowImportStatus = 'valid';

    if (!data.first_name.trim()) {
      messageKeys.push('import.error.missingFirstName');
      status = 'error';
    }
    if (!data.last_name.trim()) {
      messageKeys.push('import.error.missingLastName');
      status = 'error';
    }

    if (data.phone && !PHONE_RE.test(data.phone)) {
      messageKeys.push('import.warn.invalidPhone');
      if (status === 'valid') status = 'warning';
    }

    if (data.national_id && data.national_id.replace(/\D/g, '').length !== 10) {
      messageKeys.push('import.warn.invalidNationalId');
      if (status === 'valid') status = 'warning';
    }

    const key = duplicateKey(data);
    if (key) {
      if (existingKeys.has(key) || batchKeys.has(key)) {
        if (status !== 'error') {
          messageKeys.length = 0;
          messageKeys.push('import.warn.duplicate');
          status = 'duplicate';
        }
      } else {
        batchKeys.add(key);
      }
    }

    if (status === 'valid' && messageKeys.length === 0) {
      messageKeys.push('import.status.valid');
    }

    result.push({ rowIndex: index + 1, data, status, messageKeys });
  });

  return result;
}

export function importableRows(rows: ValidatedImportRow[]): ValidatedImportRow[] {
  return rows.filter((r) => r.status === 'valid' || r.status === 'warning');
}

export function mappingComplete(mapping: ColumnMapping): boolean {
  return REQUIRED_IMPORT_FIELDS.every((field) => Boolean(mapping[field]?.trim()));
}
