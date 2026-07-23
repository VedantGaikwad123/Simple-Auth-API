const { body, validationResult } = require('express-validator');

// Validation rules for registration
const registerValidationRules = () => {
  return [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[@$!%*?&#]/)
      .withMessage('Password must contain at least one special character')
  ];
};

// Validation rules for login
const loginValidationRules = () => {
  return [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];
};

// Middleware to evaluate validation rules
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  // Cyber security best practice: Keep validation error responses generic
  // to avoid exposing too many details about validation internals, but clear enough for consumers.
  // According to specification: Return 400 with "Invalid input" or specific message if appropriate.
  return res.status(400).json({ error: 'Invalid input' });
};

module.exports = {
  registerValidationRules,
  loginValidationRules,
  validate
};
