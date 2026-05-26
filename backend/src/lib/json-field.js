export const stringifyJsonField = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
};

export const parseJsonField = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const parseJsonFields = (record, fields) => {
  if (!record) {
    return record;
  }

  return fields.reduce(
    (current, field) => ({
      ...current,
      [field]: parseJsonField(current[field]),
    }),
    record
  );
};
