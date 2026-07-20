// controllers/maintenanceController.js
const db = require("../config/db");
const mysqldump = require("mysqldump");
const path = require("path");
const fs = require("fs");

// Fungsi pembantu untuk mencatat log aktivitas maintenance secara otomatis
async function logActivity(username, actionType, queryExecuted, status) {
  try {
    await db.query(
      "INSERT INTO sql_activity_logs (username, action_type, query_executed, status) VALUES (?, ?, ?, ?)",
      [username, actionType, queryExecuted, status],
    );
  } catch (err) {
    console.error("Gagal mencatat log aktivitas:", err.message);
  }
}

// 1. Ambil Seluruh Data Metadata Database untuk Panel Admin
exports.renderMaintenancePanel = async (req, res) => {
  try {
    const dbName = process.env.DB_NAME || "careertracker";

    // Query status dasar database
    const [versionResult] = await db.query("SELECT VERSION() as version");
    const mysqlVersion = versionResult[0].version;

    const [tablesResult] = await db.query("SHOW TABLES");
    const totalTables = tablesResult.length;

    // --- TAMBAHKAN LOGIKA INI (Sama dengan getDashboardStats) ---
    const careerTables = [
      "organizations",
      "projects",
      "experiences",
      "achievements",
      "certificates",
      "skills",
      "specials",
    ];

    // Hitung total record dari seluruh tabel yang ada
    let totalRecords = 0;
    if (totalTables > 0) {
      for (let t of tablesResult) {
        const tableName = Object.values(t)[0];
        // Hanya hitung jika tabel ada di daftar careerTables
        if (careerTables.includes(tableName)) {
          const [countRes] = await db.query(
            `SELECT COUNT(*) as total FROM \`${tableName}\``,
          );
          totalRecords += countRes[0].total;
        }
      }
    }

    // Query Data Spesifik untuk Tab Database Information
    const [dbInfo] = await db.query(
      `
            SELECT 
                TABLE_SCHEMA,
                ENGINE,
                SUM(TABLE_ROWS) as total_rows
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            GROUP BY ENGINE, TABLE_SCHEMA
        `,
      [dbName],
    );

    const storageEngine = dbInfo[0]?.ENGINE || "InnoDB";

    const [charSetResult] = await db.query(
      `
            SELECT DEFAULT_CHARACTER_SET_NAME 
            FROM information_schema.SCHEMATA 
            WHERE SCHEMA_NAME = ?
        `,
      [dbName],
    );
    const characterSet =
      charSetResult[0]?.DEFAULT_CHARACTER_SET_NAME || "utf8mb4";

    // Ambil list nama tabel saja untuk dropdown pilihan komponen UI
    const tableNames = tablesResult.map((t) => Object.values(t)[0]);

    // Ambil data log aktivitas SQL paling baru
    const [logs] = await db.query(
      "SELECT * FROM sql_activity_logs ORDER BY id DESC LIMIT 50",
    );

    // Kirimkan seluruh bundle data ke view EJS tunggal
    res.render("maintenance/index", {
      dbName,
      mysqlVersion,
      totalTables,
      totalRecords,
      storageEngine,
      characterSet,
      tableNames,
      logs,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    res
      .status(500)
      .send("Gagal memuat infrastruktur maintenance: " + err.message);
  }
};

// 2. AJAX Fetch: Mengambil Informasi Struktur Kolom & Index dari Tabel Tertentu
exports.getTableDetails = async (req, res) => {
  const { table } = req.params;
  try {
    // Validasi pengamanan nama tabel dari SQL Injection
    const [tablesResult] = await db.query("SHOW TABLES");
    const validTables = tablesResult.map((t) => Object.values(t)[0]);
    if (!validTables.includes(table)) {
      return res
        .status(400)
        .json({ error: "Tabel tidak terdaftar di sistem." });
    }

    // Ambil data struktur kolom menggunakan DESCRIBE
    const [columns] = await db.query(`DESCRIBE \`${table}\``);

    // Ambil data index menggunakan SHOW INDEX
    const [indexes] = await db.query(`SHOW INDEX FROM \`${table}\``);

    // 🔥 TAMBAHKAN HITUNGAN REAL-TIME UNTUK TABEL INI SJA
    const [countRes] = await db.query(
      `SELECT COUNT(*) as totalRows FROM \`${table}\``,
    );
    const totalRows = countRes[0].totalRows;

    // Sertakan totalRows ke dalam response JSON
    res.json({ columns, indexes, totalRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Eksekusi Upgrade Struktur: Mengamankan jalannya ALTER TABLE (ADD COLUMN & DROP COLUMN)
exports.upgradeStructure = async (req, res) => {
  // Kita ambil parameter 'action' dari req.body untuk menentukan apakah ingin TAMBAH atau HAPUS
  const {
    action,
    table_name,
    column_name,
    data_type,
    length,
    is_null,
    default_value,
  } = req.body;
  const username = req.session.user.username;
  let sql = "";

  try {
    // A. Validasi keberadaan tabel
    const [tablesResult] = await db.query("SHOW TABLES");
    const validTables = tablesResult.map((t) => Object.values(t)[0]);
    if (!validTables.includes(table_name)) {
      throw new Error(`Tabel '${table_name}' tidak ditemukan.`);
    }

    // B. Validasi nama kolom (regex: hanya boleh huruf, angka, underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(column_name)) {
      throw new Error(
        "Nama kolom tidak valid atau mengandung karakter terlarang.",
      );
    }

    // C. Cek status kolom saat ini menggunakan SHOW COLUMNS
    const [columns] = await db.query(
      `SHOW COLUMNS FROM \`${table_name}\` LIKE ?`,
      [column_name],
    );

    // ============================================================
    // LOGIKA 1: JIKA AKSI ADALAH DROP (HAPUS KOLOM)
    // ============================================================
    if (action === "DROP") {
      if (columns.length === 0) {
        throw new Error(
          `Kolom '${column_name}' tidak ditemukan di tabel '${table_name}', gagal menghapus.`,
        );
      }

      sql = `ALTER TABLE \`${table_name}\` DROP COLUMN \`${column_name}\``;

      // Eksekusi query hapus kolom
      await db.query(sql);
      await logActivity(username, "ALTER TABLE DROP", sql, "SUCCESS");

      return res.redirect(
        "/maintenance?success=The column was successfully and safely removed from the table schema!",
      );
    }

    // ============================================================
    // LOGIKA 2: JIKA AKSI ADALAH ADD (TAMBAH KOLOM) - Default
    // ============================================================
    if (columns.length > 0) {
      throw new Error(
        `Kolom '${column_name}' sudah ada di dalam tabel '${table_name}'.`,
      );
    }

    // Susun Query ALTER TABLE ADD secara dinamis & aman
    let lenSpec =
      length &&
      !["TEXT", "DATE", "TIMESTAMP", "INT"].includes(data_type.toUpperCase())
        ? `(${length})`
        : "";
    let nullSpec = is_null === "YES" ? "NULL" : "NOT NULL";
    let defaultSpec = default_value ? `DEFAULT '${default_value}'` : "";

    sql = `ALTER TABLE \`${table_name}\` ADD COLUMN \`${column_name}\` ${data_type}${lenSpec} ${nullSpec} ${defaultSpec}`;

    // Eksekusi query tambah kolom
    await db.query(sql);
    await logActivity(username, "ALTER TABLE ADD", sql, "SUCCESS");

    res.redirect(
      "/maintenance?success=The table structure has been successfully and safely upgraded!",
    );
  } catch (err) {
    await logActivity(
      username,
      action === "DROP" ? "ALTER TABLE DROP" : "ALTER TABLE ADD",
      sql || "VALIDATION FAILED",
      "FAILED",
    );
    res.redirect(`/maintenance?error=${encodeURIComponent(err.message)}`);
  }
};

// 4. Manajemen Optimasi Database: Membuat & Menghapus Index
exports.manageIndex = async (req, res) => {
  const { action, table_name, index_name, column_name, index_type } = req.body;
  const username = req.session.user.username;
  let sql = "";

  try {
    if (action === "CREATE") {
      if (
        !/^[a-zA-Z0-9_]+$/.test(index_name) ||
        !/^[a-zA-Z0-9_]+$/.test(column_name)
      ) {
        throw new Error(
          "Nama index atau nama kolom tidak memenuhi standar regulasi.",
        );
      }

      if (index_type === "UNIQUE") {
        sql = `CREATE UNIQUE INDEX \`${index_name}\` ON \`${table_name}\` (\`${column_name}\`)`;
      } else {
        sql = `CREATE INDEX \`${index_name}\` ON \`${table_name}\` (\`${column_name}\`)`;
      }
      await db.query(sql);
      await logActivity(username, "CREATE INDEX", sql, "SUCCESS");
      res.redirect(
        "/maintenance?success=Optimization index successfully created!",
      );
    } else if (action === "DROP") {
      sql = `DROP INDEX \`${index_name}\` ON \`${table_name}\``;
      await db.query(sql);
      await logActivity(username, "DROP INDEX", sql, "SUCCESS");
      res.redirect("/maintenance?success=Index successfully deleted!");
    }
  } catch (err) {
    await logActivity(
      username,
      action + " INDEX",
      sql || "VALIDATION FAILED",
      "FAILED",
    );
    res.redirect(`/maintenance?error=${encodeURIComponent(err.message)}`);
  }
};

// 5. Reset Database Tanpa Merusak Skema (DELETE, Reset Auto-Increment, Re-seed)
exports.resetDatabase = async (req, res) => {
  const username = req.session.user.username;
  console.log("Mencoba reset database...");
  try {
    // Matikan foreign key check sementara agar pembersihan total tidak memicu constraint conflict
    await db.query("SET FOREIGN_KEY_CHECKS = 0");

    const tablesToClear = [
      "specials",
      "organizations",
      "experiences",
      "achievements",
      "certificates",
      "skills",
      "projects",
    ];

    // Lakukan sekuens DELETE dan penataan ulang AUTO_INCREMENT
    for (let table of tablesToClear) {
      await db.query(`DELETE FROM \`${table}\``);
      await db.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
    }

    // Aktifkan kembali pengecekan foreign key
    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    // Jalankan program Seeder Data Karir Dummy Awal ke tabel Projects & Organizations agar aplikasi tidak kosong melompong
    await db.query(`
            INSERT INTO organizations (user_id, org_name, role, industry, description) 
            VALUES (1, 'Google Student Club', 'Core Member', 'Technology', 'Managed cloud cluster networks.')
        `);
    await db.query(`
            INSERT INTO projects (user_id, project_name, category, status, description) 
            VALUES (1, 'E-Commerce Engine', 'Web Apps', 'Completed', 'Monolithic scale application stack.')
        `);

    await logActivity(
      username,
      "RESET DATABASE",
      "TRUNCATE PIPELINES & RE-SEED DUMMY",
      "SUCCESS",
    );
    res.redirect(
      "/maintenance?success=The database has been restored to its initial state, and the seeder was successfully injected!",
    );
  } catch (err) {
    await logActivity(
      username,
      "RESET DATABASE",
      "RESET TRANSACTION",
      "FAILED",
    );
    res.redirect(`/maintenance?error=${encodeURIComponent(err.message)}`);
  }
};

// 6. AJAX Fetch: Mengambil data real-time khusus untuk panel Maintenance Dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const [tablesResult] = await db.query("SHOW TABLES");
    const totalTables = tablesResult.length;

    // --- MULAI MODIFIKASI ---
    // List tabel yang hanya ingin dihitung sebagai "Career Record"
    const careerTables = [
      "organizations",
      "projects",
      "experiences",
      "achievements",
      "certificates",
      "skills",
      "specials",
    ];

    let totalRecords = 0;
    if (totalTables > 0) {
      for (let t of tablesResult) {
        const tableName = Object.values(t)[0];

        // Hanya hitung jika tabel ada di dalam daftar careerTables
        if (careerTables.includes(tableName)) {
          const [countRes] = await db.query(
            `SELECT COUNT(*) as total FROM \`${tableName}\``,
          );
          totalRecords += countRes[0].total;
        }
      }
    }
    // --- SELESAI MODIFIKASI ---

    res.json({ totalTables, totalRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.backupDatabase = async (req, res) => {
  const username = req.session.user.username || "admin";
  try {
    const backupPath = path.join(
      __dirname,
      "../backups",
      `backup-${Date.now()}.sql`,
    );

    // Pastikan folder 'backups' ada
    if (!fs.existsSync(path.join(__dirname, "../backups"))) {
      fs.mkdirSync(path.join(__dirname, "../backups"));
    }

    await mysqldump({
      connection: {
        host: "db",
        user: "user", // sesuaikan dengan config db kamu
        password: "userpassword", // sesuaikan dengan config db kamu
        database: "careertracker",
      },
      dumpToFile: backupPath,
    });

    await logActivity(
      username,
      "BACKUP DATABASE",
      "EXPORT SQL DUMP",
      "SUCCESS",
    );

    // Otomatis download file ke browser
    res.download(backupPath, "database_backup.sql", (err) => {
      if (err) console.error("Gagal download:", err);
      // Opsional: hapus file setelah didownload agar server tidak penuh
      // fs.unlinkSync(backupPath);
    });
  } catch (err) {
    await logActivity(username, "BACKUP DATABASE", "EXPORT FAILED", "FAILED");
    res.status(500).send("Backup gagal: " + err.message);
  }
};
