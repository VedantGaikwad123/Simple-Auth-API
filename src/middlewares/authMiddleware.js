const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const parts = authHeader.split(' ');
  
  // Authorization header must be in format "Bearer <token>"
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = parts[1];
  const secret = process.env.JWT_SECRET;
  
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Unauthorized' }); // or "Authentication required"
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Attach decoded user claims (e.g. userId) to the request object
    req.user = decoded;
    next();
  });
};

module.exports = {
  authenticateJWT
};
