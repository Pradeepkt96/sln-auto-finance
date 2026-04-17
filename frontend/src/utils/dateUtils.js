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
