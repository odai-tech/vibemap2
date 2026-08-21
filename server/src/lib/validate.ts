/** Tiny request validators — throw 400s with field context. */
import { HttpError } from './http.ts';

export function asRecord(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new HttpError(400, 'Expected a JSON object body');
  }
  return v as Record<string, unknown>;
}

export function str(v: unknown, field: string, opts: { min?: number; max: number; pattern?: RegExp }): string {
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be a string`);
  const trimmed = v.trim();
  if (opts.min !== undefined && trimmed.length < opts.min) {
    throw new HttpError(400, `${field} must be at least ${opts.min} characters`);
  }
  if (trimmed.length > opts.max) throw new HttpError(400, `${field} must be at most ${opts.max} characters`);
  if (opts.pattern && !opts.pattern.test(trimmed)) throw new HttpError(400, `${field} has an invalid format`);
  return trimmed;
}

export function optStr(v: unknown, field: string, opts: { max: number }): string {
  if (v === undefined || v === null) return '';
  return str(v, field, { ...opts, min: 0 });
}

export function num(v: unknown, field: string, opts: { min: number; max: number }): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new HttpError(400, `${field} must be a number`);
  if (v < opts.min || v > opts.max) throw new HttpError(400, `${field} out of range`);
  return v;
}

export function optNum(v: unknown, field: string, opts: { min: number; max: number }): number | null {
  if (v === undefined || v === null) return null;
  return num(v, field, opts);
}

export function oneOf<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
}

export function strArray(v: unknown, field: string, opts: { maxItems: number; maxLen: number }): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new HttpError(400, `${field} must be an array`);
  if (v.length > opts.maxItems) throw new HttpError(400, `${field}: too many items`);
  return v.map((item, i) => str(item, `${field}[${i}]`, { min: 1, max: opts.maxLen }));
}

export function bool(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') throw new HttpError(400, `${field} must be a boolean`);
  return v;
}
