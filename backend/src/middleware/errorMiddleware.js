const { error } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  // Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const fields = err.meta?.target || 'field';
    return error(res, `A record with this ${Array.isArray(fields) ? fields.join(', ') : fields} already exists.`, 409);
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return error(res, 'Record not found.', 404);
  }

  // Payload syntax error (e.g., malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, 'Malformed JSON in request body.', 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return error(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

const notFoundHandler = (req, res) => {
  return error(res, `API route not found: ${req.method} ${req.originalUrl}`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
