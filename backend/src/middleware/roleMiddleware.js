const { error } = require('../utils/response');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required.', 401);
    }

    // Flatten if passed as array or multiple args
    const flatRoles = allowedRoles.flat();

    if (!flatRoles.includes(req.user.role)) {
      return error(
        res,
        `Access denied. Requires one of the following roles: [${flatRoles.join(', ')}]. Current role: '${req.user.role}'`,
        403
      );
    }

    next();
  };
};

module.exports = {
  requireRole,
};
