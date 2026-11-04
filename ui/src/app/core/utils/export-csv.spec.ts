import { exportToCsv } from './export-csv';
import { Lead } from '../models/lead.model';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'id-1', user_id: 'u-1', name: 'Acme Corp', city: 'Austin', address: '123 Main St',
    type: 'restaurant', types: [], rating: 4.5, total_ratings: 100, place_id: 'pid',
    website: 'https://acme.com', phone: '555-1234', contact_name: 'Jane', contact_email: 'jane@acme.com',
    ai_score: 'hot', ai_reason: 'Great fit', offering: 'web design', status: 'new', created_at: '2026-01-01',
    ...overrides,
  };
}

describe('exportToCsv', () => {
  it('produces a header row as first line', () => {
    const _csv = exportToCsv([makeLead()]);
    const _lines = _csv.split('\n');
    expect(_lines[0]).toContain('name');
    expect(_lines[0]).toContain('city');
    expect(_lines[0]).toContain('contact_email');
  });

  it('serialises lead data on subsequent rows', () => {
    const _csv = exportToCsv([makeLead({ name: 'TestCo', city: 'Dallas' })]);
    const _lines = _csv.split('\n');
    expect(_lines[1]).toContain('TestCo');
    expect(_lines[1]).toContain('Dallas');
  });

  it('produces one row per lead plus the header', () => {
    const _csv = exportToCsv([makeLead(), makeLead({ id: 'id-2', name: 'Beta Ltd' })]);
    expect(_csv.split('\n').length).toBe(3);
  });

  it('escapes commas inside field values', () => {
    const _csv = exportToCsv([makeLead({ name: 'Smith, Jones & Co' })]);
    expect(_csv).toContain('"Smith, Jones & Co"');
  });

  it('escapes double-quotes inside field values', () => {
    const _csv = exportToCsv([makeLead({ name: 'Say "Hello"' })]);
    expect(_csv).toContain('"Say ""Hello"""');
  });

  it('returns only header when leads array is empty', () => {
    const _csv = exportToCsv([]);
    expect(_csv.split('\n').length).toBe(1);
    expect(_csv).toContain('name');
  });
});
