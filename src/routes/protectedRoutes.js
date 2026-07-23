const express = require('express');
const { authenticateJWT } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protected route sample
router.get('/protected', authenticateJWT, (req, res) => {
  return res.status(200).json({
    message: 'Access granted to protected route',
    user: req.user // Decoded JWT payload containing userId
  });
});

module.exports = router;
