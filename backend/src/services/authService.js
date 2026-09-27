const prisma = require('../utils/prisma');
const { hashPassword, comparePassword } = require('../utils/passwords');
const { generateToken } = require('../utils/jwt');

const register = async ({ email, password, name }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isGlobalAdmin: true,
      createdAt: true,
    },
  });

  const token = generateToken(user);

  return { user, token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isGlobalAdmin: user.isGlobalAdmin,
    createdAt: user.createdAt,
  };

  const token = generateToken(safeUser);

  return { user: safeUser, token };
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      isGlobalAdmin: true,
      createdAt: true,
      organizedEvents: {
        select: { id: true, title: true, status: true, deadline: true },
      },
      teamMemberships: {
        include: {
          team: {
            include: {
              event: {
                select: { id: true, title: true, status: true, deadline: true },
              },
              submission: {
                select: { id: true, title: true, submittedAt: true },
              },
            },
          },
        },
      },
      judgeProfiles: {
        include: {
          event: {
            select: { id: true, title: true, status: true },
          },
        },
      },
    },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

module.exports = {
  register,
  login,
  getProfile,
};
