const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');
const prisma = require('../utils/prisma');

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader.trim();
      }
    }

    // 2. Check Cookie header (e.g. Cookie: session=<token> or Cookie: token=<token>)
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [k, v] = cookie.trim().split('=');
        if (k === 'session' || k === 'token' || k === 'jwt') {
          token = decodeURIComponent(v);
          break;
        }
      }
    }

    if (!token) {
      return error(res, 'Authentication required. No credentials provided.', 401);
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
