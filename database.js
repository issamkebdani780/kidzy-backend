import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Always use individual params so SSL options are passed correctly.
// If MYSQL_URL is set, parse the credentials from it; otherwise fall back to individual env vars.
let poolConfig;

if (process.env.MYSQL_URL) {
  // Parse: mysql://user:password@host:port/database
  const url = new URL(process.env.MYSQL_URL);
  poolConfig = {
    host:     url.hostname,
    user:     url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', ''),
    port:     parseInt(url.port) || 3306,
    ssl:      { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 20000,
  };
} else {
  poolConfig = {
    host:     process.env.MYSQLHOST,
    user:     process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port:     parseInt(process.env.MYSQLPORT) || 3306,
    ssl:      { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 20000,
  };
}

const pool = mysql.createPool(poolConfig);

export default pool;
