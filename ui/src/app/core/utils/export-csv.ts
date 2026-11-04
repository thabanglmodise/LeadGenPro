import { Lead } from '../models/lead.model';

const CSV_HEADERS = [
  'name', 'city', 'address', 'type', 'website', 'phone',
  'contact_name', 'contact_email', 'rating', 'ai_score', 'ai_reason', 'status',
] as const;

function escapeField(value: unknown): string {
  const _str = String(value ?? '');
  if (_str.includes(',') || _str.includes('"') || _str.includes('\n')) {
    return `"${_str.replace(/"/g, '""')}"`;
  }
  return _str;
}

export function exportToCsv(leads: Lead[]): string {
  const _header = CSV_HEADERS.join(',');
  const _rows = leads.map(_lead =>
    CSV_HEADERS.map(_col => escapeField(_lead[_col as keyof Lead])).join(',')
  );
  return [_header, ..._rows].join('\n');
}
