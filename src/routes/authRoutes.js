const express = require('express');
const { register, login } = require('../controllers/authController');
const { registerValidationRules, loginValidationRules, validate } = require('../validation/authValidation');

const router = express.Router();

// Public auth routes with validation
router.post('/register', registerValidationRules(), validate, register);
router.post('/login', loginValidationRules(), validate, login);

module.exports = router;
