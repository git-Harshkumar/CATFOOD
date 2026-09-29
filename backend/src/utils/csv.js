/**
 * RFC-4180 Compliant CSV Serializer
 * 
 * Safely escapes fields containing commas, double quotes, or newlines.
 * Neutralizes CSV formula injection starting with =, +, -, @, \t, \r.
 */

const sanitizeFormula = (str) => {
  if (typeof str !== 'string') return str;
  if (['=', '+', '-', '@', '\t', '\r'].includes(str.charAt(0))) {
    return `'${str}`;
  }
  return str;
};

const formatCsv = (headers, rows) => {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const safeStr = typeof val === 'string' ? sanitizeFormula(val) : String(val);
    if (safeStr.includes('"') || safeStr.includes(',') || safeStr.includes('\n') || safeStr.includes('\r')) {
      return `"${safeStr.replace(/"/g, '""')}"`;
    }
    return safeStr;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));

  return [headerLine, ...rowLines].join('\r\n');
};

module.exports = {
  formatCsv,
  sanitizeFormula,
  sanitizeCsvCell: sanitizeFormula,
};
