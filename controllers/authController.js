const db = require("../config/db");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Konfigurasi Multer untuk Upload Foto Profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./public/uploads/profiles";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Nama file unik berdasarkan ID user
    cb(
      null,
      "profile-" + req.session.user.id + path.extname(file.originalname),
    );
  },
});

exports.uploadProfile = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Hanya file gambar yang diperbolehkan!"), false);
  },
});

// Render Halaman Login
exports.renderLogin = (req, res) => {
  res.render("auth/login", {
    error: req.query.error || null,
    success: req.query.success || null,
  });
};

// Render Halaman Register
exports.renderRegister = (req, res) => {
  res.render("auth/register", { error: req.query.error || null });
};

// Proses Register User Baru
exports.processRegister = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const [existing] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email],
    );
    if (existing.length > 0) {
      return res.redirect(
        "/register?error=Username or Email already synchronized.",
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role saat registrasi mandiri di aplikasi dipastikan 'USER'
    const defaultRole = "USER";
    const [result] = await db.query(
      "INSERT INTO users (username, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)",
      [username, email, hashedPassword, null, defaultRole],
    );

    // Menyimpan data user & role ke session setelah register berhasil
    req.session.user = {
      id: result.insertId,
      username: username,
      email: email,
      avatar: null,
      role: defaultRole, // Menyimpan status role USER di session
    };

    // Karena user baru teregistrasi sebagai USER, langsung lempar ke dashboard utama
    res.redirect("/");
  } catch (err) {
    res.redirect(`/register?error=${encodeURIComponent(err.message)}`);
  }
};

// Proses Update Foto Profil
// Proses Update Foto Profil (VERSI PERBAIKAN)
exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.redirect("/");

    const photo = req.file.filename;
    await db.query("UPDATE users SET avatar = ? WHERE id = ?", [
      photo,
      req.session.user.id,
    ]);

    // Update session agar foto di navbar langsung berubah tanpa perlu login ulang
    req.session.user.avatar = photo;

    // PERBAIKAN: Menggunakan "back" untuk semua role (ADMIN maupun USER)
    // Dengan ini, siapapun yang upload foto akan tetap berada di halaman asalnya
    res.redirect("back");
  } catch (err) {
    res.status(500).send("Failed to upload photo: " + err.message);
  }
};

// Proses Login dengan Deteksi Role & Conditional Redirect
exports.processLogin = async (req, res) => {
  const { identity, password } = req.body;
  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [identity, identity],
    );
    if (users.length === 0)
      return res.redirect("/login?error=Identity credentials reject.");

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.redirect("/login?error=Invalid password.");

    // [PENTING] Memasukkan properti role dari database ke dalam session user
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role || "USER", // Jika di DB bernilai NULL, otomatis anggap USER
    };

    // [ALUR REDIRECT BARU] Memisahkan pintu masuk berdasarkan Role
    if (req.session.user.role === "ADMIN") {
      return res.redirect("/maintenance"); // Admin langsung meluncur ke panel Maintenance
    } else {
      return res.redirect("/"); // User biasa masuk ke dashboard CareerTracker biasa
    }
  } catch (err) {
    res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
  }
};

// Proses Logout
exports.processLogout = (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/login?success=Session cleared.");
  });
};
