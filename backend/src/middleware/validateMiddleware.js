const { error } = require('../utils/response');

const validate = (validatorFn) => {
  return (req, res, next) => {
    const errors = validatorFn(req.body);
    if (errors && Object.keys(errors).length > 0) {
      return error(res, 'Validation failed', 400, errors);
    }
    next();
  };
};

module.exports = {
  validate,
};
