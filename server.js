const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");
// db tidak perlu di-require di sini lagi karena sudah di-handle oleh controller via router
const webRoutes = require("./routes/web");

// Import Middleware Keamanan Admin & Router Maintenance Baru
const { isAdmin } = require("./middlewares/adminMiddleware");
const maintenanceRoutes = require("./routes/maintenance");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // <-- Deklarasi PORT Utama

// Middleware untuk membaca form input HTML
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set Template Engine (EJS) untuk View-nya nanti
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Konfigurasi Session Middleware yang Lebih Ringan & Stabil untuk Docker
app.use(
  session({
    secret: "careertracker_ultra_secret_key_node_cluster_2026",
    resave: true, // Ubah jadi true agar session dipaksa disimpan kembali ke store
    saveUninitialized: true, // Ubah jadi true agar session kosong tetap diinisialisasi
    cookie: {
      secure: false, // Wajib false karena kita masih pakai http://localhost (belum https)
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// Global view variables (agar objek 'user' selalu bisa diakses di semua file EJS)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// HUBUNGKAN ROUTER PANEL MAINTENANCE ADMIN (Diproteksi penuh oleh isAdmin)
app.use("/maintenance", isAdmin, maintenanceRoutes);

// HUBUNGKAN ROUTER UTAMA USER BISA / CUSTOMER ENGINE
app.use("/", webRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server CareerTracker berjalan di http://localhost:${PORT}`);
});
