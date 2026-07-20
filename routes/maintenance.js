// routes/maintenance.js
const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenanceController");

// Render halaman utama panel satu pintu
router.get("/", maintenanceController.renderMaintenancePanel);

// API Endpoint untuk mengambil metadata kolom secara real-time via AJAX fetch
router.get("/table-details/:table", maintenanceController.getTableDetails);
// 🔥 TAMBAHKAN BARIS INI
router.get("/dashboard-stats", maintenanceController.getDashboardStats);

// POST Actions untuk pemrosesan perintah DDL/DML database
router.post("/upgrade-structure", maintenanceController.upgradeStructure);
router.post("/manage-index", maintenanceController.manageIndex);
router.post("/reset-database", maintenanceController.resetDatabase);

router.get("/backup-database", maintenanceController.backupDatabase);

module.exports = router;
