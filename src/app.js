const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('./middlewares/mongoSanitize');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

const connectDB = async () => {
  // We import connectDB dynamically to avoid cycle if any, or just import it directly
  const dbConnect = require('./config/db');
  await dbConnect();
};

dotenv.config();

const app = express();

// 1. Database Connection
connectDB();

// 2. Security Headers (Helmet)
app.use(helmet());

// 3. Prevent NoSQL Query Injection (Mongo Sanitize)
app.use(mongoSanitize());

// 4. Rate Limiting Configurations
// Global Rate Limiter: max 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(globalLimiter);

// Strict Auth Limiter: max 15 requests per 15 minutes for registration and login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Body Parsing with Strict Payload Size Limitations (Mitigates DOS via huge payloads)
app.use(express.json({ limit: '10kb' }));

// 6. Routes Import
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');

// Apply routes
app.use('/api', authLimiter, authRoutes); // Auth endpoints rate limited strictly
app.use('/api', protectedRoutes);

// 7. 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 8. Global Error Handler (Prevents stack-trace leaks)
app.use((err, req, res, next) => {
  // If it's a JSON syntax parsing error (e.g. malformed body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  console.error(`[App Error] Unhandled Exception: ${err.message}`);
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
