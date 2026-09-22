/**
 * RFC-4180 Compliant CSV Serializer
 * 
 * Safely escapes fields containing commas, double quotes, or newlines.
 * 
 * @param {Array<string>} headers
 * @param {Array<Array<any>>} rows
 * @returns {string} CSV string
 */
const formatCsv = (headers, rows) => {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));

  return [headerLine, ...rowLines].join('\r\n');
};

module.exports = {
  formatCsv,
};
