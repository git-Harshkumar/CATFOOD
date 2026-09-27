const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');
const prisma = require('../utils/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Authentication required. No Bearer token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return error(res, 'Invalid token format.', 401);
    }

    const decoded = verifyToken(token);
    
    // Verify user exists in database to prevent stale tokens for deleted users
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        isGlobalAdmin: true,
      },
    });

    if (!user) {
      return error(res, 'User no longer exists.', 401);
    }

    req.user = {
      ...user,
      role: decoded.role || (user.isGlobalAdmin ? 'ADMIN' : 'PARTICIPANT'),
    };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return error(res, 'Invalid or expired token.', 401);
    }
    return error(res, 'Authentication failed.', 401);
  }
};

module.exports = {
  authenticate,
};
