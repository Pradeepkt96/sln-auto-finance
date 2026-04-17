/**
 * Formats a date string or Date object to dd/mm/yyyy
 * @param {string|Date} dateParam 
 * @returns {string}
 */
export const formatDate = (dateParam) => {
  if (!dateParam) return '-';
  const date = new Date(dateParam);
  if (isNaN(date.getTime())) return '-';

  // Use UTC accessors so a UTC-midnight date like "2026-04-15T00:00:00Z"
  // always renders as 15/04/2026 regardless of the viewer's timezone (e.g. IST +5:30)
  const day   = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year  = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Formats a date string to yyyy-mm-dd (required for HTML date inputs)
 * @param {string|Date} dateParam 
 * @returns {string}
 */
export const toInputDate = (dateParam) => {
  if (!dateParam) return '';
  const date = new Date(dateParam);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Converts a Date / ISO string to dd/mm/yyyy for a text <input> with dd/mm/yyyy format.
 * @param {string|Date} dateParam
 * @returns {string}  e.g. "15/04/2026"
 */
export const toDisplayInputDate = (dateParam) => {
  if (!dateParam) return '';
  const date = new Date(dateParam);
  if (isNaN(date.getTime())) return '';
  const day   = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year  = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parses a dd/mm/yyyy text-input value to yyyy-mm-dd (ISO date string) for the backend.
 * Returns '' if the format is invalid.
 * @param {string} ddmmyyyy  e.g. "15/04/2026"
 * @returns {string}  e.g. "2026-04-15"
 */
export const parseDisplayDate = (ddmmyyyy) => {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length !== 4) return '';
  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? '' : iso;
};
