const authService = require('../services/authService');
const { success, error } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return success(res, result, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return success(res, result, 'Login successful', 200);
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return success(res, user, 'Profile retrieved successfully', 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getProfile,
};
