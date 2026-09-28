// Reading a platform's JSON answers (X, Facebook) without trusting their shape.

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value);

// The parsed body, or undefined when the platform answered something that is not JSON.
export const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

export const recordField = (body: Readonly<Record<string, unknown>>, field: string): Readonly<Record<string, unknown>> => {
  const value = body[field];
  return isRecord(value) ? value : {};
};

export const stringField = (body: Readonly<Record<string, unknown>>, field: string): string | undefined => {
  const value = body[field];
  return typeof value === 'string' ? value : undefined;
};
