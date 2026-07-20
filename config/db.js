const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "careertracker_db",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "rootpassword",
};

let pool = null;

async function getPool() {
  if (pool) return pool;

  try {
    // 1. Koneksi awal handshake
    const connection = await mysql.createConnection(dbConfig);

    // 2. Buat database otomatis jika belum ada
    await connection.query(`CREATE DATABASE IF NOT EXISTS careertracker;`);
    await connection.query(`USE careertracker;`);

    // ------------------------------------------------------------------
    // 🚀 BANGUN KEMBALI SEKUENS SKEMA JIKA BELUM ADA (IF NOT EXISTS)
    // Berfungsi mengunci tabel agar tidak dibuat ulang dari nol jika sudah ada data
    // ------------------------------------------------------------------

    // A. Master Tabel Users (DITAMBAHKAN kolom role untuk sistem keamanan Admin)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          avatar VARCHAR(255) NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'USER',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // B. Tambahan Validasi Kolom 'role' (Proteksi jika tabel users lama sudah terlanjur ada sebelum ditambahkan kolom role)
    const [columns] = await connection.query("SHOW COLUMNS FROM users");
    const hasRoleColumn = columns.some((col) => col.Field === "role");
    if (!hasRoleColumn) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER' AFTER avatar",
      );
      console.log(
        "⚠️ Kolom 'role' berhasil disuntikkan secara aman ke tabel users yang sudah ada!",
      );
    }

    // C. Tabel SQL Activity Log (Wajib digunakan untuk mencatat audit log aktivitas Maintenance)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sql_activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          query_executed TEXT NOT NULL,
          status VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // D. Tabel Certificates (Dilengkapi issue_date untuk ORDER CLAUSE)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS certificates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          name VARCHAR(255) NOT NULL,
          issuing_organization VARCHAR(255) NOT NULL,
          issue_date DATE NULL,
          expiration_date DATE NULL,
          credential_id VARCHAR(255) NULL,
          credential_url TEXT NULL,
          certificate_img VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // E. Tabel Skills (Dilengkapi category & name untuk ORDER CLAUSE)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS skills (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          proficiency_level VARCHAR(50) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // F. Tabel Projects (DIREPARASI SEPENUHNYA: Menambahkan status, start_date, end_date)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          project_name VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          status VARCHAR(100) NOT NULL,
          start_date DATE NULL,
          end_date DATE NULL,
          description TEXT NULL,
          project_url TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // G. Tabel Experiences (Dilengkapi start_date untuk ORDER CLAUSE)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS experiences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          title VARCHAR(255) NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          location VARCHAR(255) NULL,
          start_date DATE NULL,
          end_date DATE NULL,
          is_current TINYINT DEFAULT 0,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // H. Tabel Achievements
    await connection.query(`
      CREATE TABLE IF NOT EXISTS achievements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          title VARCHAR(255) NOT NULL,
          issuer VARCHAR(255) NOT NULL,
          date_awarded DATE NULL,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // I. Tabel Organizations (DIREPARASI SEPENUHNYA: Menggunakan org_name dan industry)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS organizations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          org_name VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          industry VARCHAR(255) NULL,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // J. Tabel Specials
    await connection.query(`
      CREATE TABLE IF NOT EXISTS specials (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          title VARCHAR(255) NOT NULL,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // ------------------------------------------------------------------
    // 🎁 INJEKSI OTOMATIS USER DUMMY ID = 1 (Ditambahkan role 'ADMIN')
    // ------------------------------------------------------------------
    const bcrypt = require("bcryptjs");
    const dummyPassword = await bcrypt.hash("secretpassword", 10);
    await connection.query(
      `
      INSERT INTO users (id, username, email, password, role) 
      VALUES (1, 'admin', 'admin@careertracker.com', ?, 'ADMIN')
      ON DUPLICATE KEY UPDATE role='ADMIN';
    `,
      [dummyPassword],
    );

    await connection.end();

    // Bangun pool koneksi utama
    pool = mysql.createPool({
      ...dbConfig,
      database: "careertracker",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log(
      "✅ PERFECT SYSTEM DEPLOYED: Storage Secured & Admin Role Ready!",
    );
    return pool;
  } catch (err) {
    console.error("⏳ Database connection failed: ", err.message);
    throw err;
  }
}

module.exports = {
  query: async (sql, params) => {
    try {
      const activePool = await getPool();
      return await activePool.query(sql, params);
    } catch (err) {
      throw new Error("Database Communication Fault: " + err.message);
    }
  },
  getPool: getPool,
};
