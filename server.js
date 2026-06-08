import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './database.js';
import orderRouter from './Router/order.router.js';
import contactRouter from './Router/contact.router.js';
import authRouter from './Router/auth.router.js';

dotenv.config();

const app = express();

// ──────────────────────────────────────────
// CORS Configuration
// ──────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.match(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.railway.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────
// Routes
// ──────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/orders', orderRouter);
app.use('/api/contact', contactRouter);


// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Kidzy API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err.message);
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
});

// ──────────────────────────────────────────
// Database Init — Create tables if they don't exist
// ──────────────────────────────────────────
async function initDatabase() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully!');

    // Orders table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        kid_name        VARCHAR(100)  NOT NULL,
        phone           VARCHAR(20)   NOT NULL,
        story_type      VARCHAR(50)   NOT NULL,
        image_url       TEXT          NOT NULL,
        image_public_id VARCHAR(255)  NULL,
        status          ENUM('pending', 'img_confiremed', 'in delivery', 'paid', 'cancelled')
                        NOT NULL DEFAULT 'pending',
        created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Table 'orders' is ready.");

    // Run Migration: Alter status ENUM if table already exists with old ENUM
    try {
      // 1. Temporarily allow both old and new ENUM values to prevent constraint errors during migration
      await conn.query(`
        ALTER TABLE orders MODIFY COLUMN status 
        ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'img_confiremed', 'in delivery', 'paid', 'piad') 
        NOT NULL DEFAULT 'pending';
      `);
      
      // 2. Map old values to new values
      await conn.query("UPDATE orders SET status = 'img_confiremed' WHERE status = 'processing'");
      await conn.query("UPDATE orders SET status = 'in delivery' WHERE status = 'shipped'");
      await conn.query("UPDATE orders SET status = 'paid' WHERE status = 'delivered' OR status = 'piad'");
      
      // 3. Set the final strict ENUM list (removing piad, adding cancelled)
      await conn.query(`
        ALTER TABLE orders MODIFY COLUMN status 
        ENUM('pending', 'img_confiremed', 'in delivery', 'paid', 'cancelled') 
        NOT NULL DEFAULT 'pending';
      `);
      
      console.log("✅ Database status ENUM migration ran successfully.");
    } catch (migErr) {
      console.log("ℹ️ Migration check passed or already applied:", migErr.message);
    }

    // Contacts table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        phone      VARCHAR(20)  NOT NULL,
        message    TEXT         NOT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Table 'contacts' is ready.");

    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Check your MYSQLHOST / MYSQLPORT in .env — make sure Railway public URL is correct.');
    // Do NOT crash the server — APIs will return DB errors per-request
  }
}


// ──────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`\n🚀 Kidzy API running on http://${HOST}:${PORT}`);
  console.log(`📋 Allowed origins: ${allowedOrigins.join(', ')}\n`);
  await initDatabase();
});
