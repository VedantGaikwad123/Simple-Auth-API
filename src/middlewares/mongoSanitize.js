/**
 * Recursive function to strip any keys that start with '$' or contain '.'
 * to prevent MongoDB operator injection.
 */
const sanitize = (target) => {
  if (target instanceof Object) {
    for (const key in target) {
      if (key.startsWith('$') || key.includes('.')) {
        delete target[key];
      } else {
        sanitize(target[key]);
      }
    }
  }
  return target;
};

/**
 * Express 5 compatible NoSQL injection sanitizer middleware.
 * Mutates query, body, and parameter objects in-place without reassigning
 * the read-only properties of the request object.
 */
const mongoSanitize = (req, res, next) => {
  if (req.body) {
    sanitize(req.body);
  }
  if (req.query) {
    sanitize(req.query);
  }
  if (req.params) {
    sanitize(req.params);
  }
  next();
};

module.exports = mongoSanitize;
