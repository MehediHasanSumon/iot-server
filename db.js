require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

const databaseName = process.env.DB_NAME || 'iot_db';

let pool;

async function initDB() {
  try {
    // 1. Connect without DB to ensure database exists
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
    });

    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await tempConnection.end();

    // 2. Initialize connection pool targeting databaseName
    pool = mysql.createPool({
      ...dbConfig,
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // 3. Create table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS devices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE,
        status ENUM('on', 'off') NOT NULL DEFAULT 'off',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);

    // 4. Seed 4 devices if they don't exist
    const seedDevicesQuery = `
      INSERT INTO devices (id, name, status)
      VALUES
        (1, 'Device 1', 'off'),
        (2, 'Device 2', 'off'),
        (3, 'Device 3', 'off'),
        (4, 'Device 4', 'off')
      ON DUPLICATE KEY UPDATE name=VALUES(name);
    `;
    await pool.query(seedDevicesQuery);

    console.log(`[DB] Connected to MySQL database "${databaseName}" and verified devices table.`);
  } catch (error) {
    console.error('[DB] Database initialization error:', error.message);
    console.error('[DB] Please check your database settings in the .env file.');
  }
}

function getPool() {
  if (!pool) {
    // Fallback pool creation if initDB hasn't finished or was bypassed
    pool = mysql.createPool({
      ...dbConfig,
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

module.exports = {
  initDB,
  getPool,
};
