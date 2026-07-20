const express = require("express");
const router = express.Router();

// Database Engine Bridge
const db = require("../config/db");

// Authentication
const authController = require("../controllers/authController");
const protectRoute = require("../middlewares/authMiddleware");

// Import Controller Modul
const projectController = require("../controllers/projectController");
const organizationController = require("../controllers/organizationController");
const experienceController = require("../controllers/experienceController");
const achievementController = require("../controllers/achievementController");
const certificateController = require("../controllers/certificateController");
const skillController = require("../controllers/skillController");

// ==========================================
// Authentication Routes (Terbuka Umum)
// ==========================================
router.get("/login", authController.renderLogin);
router.post("/login", authController.processLogin);
router.get("/register", authController.renderRegister);
router.post("/register", authController.processRegister);
router.get("/logout", authController.processLogout);

// ==========================================
// Dashboard (Protected & Real-time Stats)
// ==========================================
router.get("/", protectRoute, async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;

  try {
    // Jalankan query hitung jumlah data secara paralel demi performa cepat
    const [projectsCount] = await db.query(
      "SELECT COUNT(*) as total FROM projects WHERE user_id = ?",
      [userId],
    );
    const [organizationsCount] = await db.query(
      "SELECT COUNT(*) as total FROM organizations WHERE user_id = ?",
      [userId],
    );
    const [experiencesCount] = await db.query(
      "SELECT COUNT(*) as total FROM experiences WHERE user_id = ?",
      [userId],
    );
    const [achievementsCount] = await db.query(
      "SELECT COUNT(*) as total FROM achievements WHERE user_id = ?",
      [userId],
    );
    const [certificatesCount] = await db.query(
      "SELECT COUNT(*) as total FROM certificates WHERE user_id = ?",
      [userId],
    );
    const [skillsCount] = await db.query(
      "SELECT COUNT(*) as total FROM skills WHERE user_id = ?",
      [userId],
    );

    // Ambil data untuk looping tabel proyek terbaru di dashboard
    const [latestProjects] = await db.query(
      "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [userId],
    );

    res.render("dashboard", {
      stats: {
        projects: projectsCount[0].total,
        organizations: organizationsCount[0].total,
        experiences: experiencesCount[0].total,
        achievements: achievementsCount[0].total,
        certificates: certificatesCount[0].total,
        skills: skillsCount[0].total,
      },
      latestProjects: latestProjects || [],
      projectStats: [
        projectsCount[0].total,
        organizationsCount[0].total,
        experiencesCount[0].total,
        achievementsCount[0].total,
        certificatesCount[0].total,
        skillsCount[0].total,
      ], // Dikosongkan agar grafik/loop status baris 376 aman
    });
  } catch (err) {
    console.error("⏳ Dashboard Stats Fetch Error: ", err.message);

    // Fallback data aman jika database bermasalah saat memuat statistik
    res.render("dashboard", {
      stats: {
        projects: 0,
        organizations: 0,
        experiences: 0,
        achievements: 0,
        certificates: 0,
        skills: 0,
      },
      latestProjects: [],
      projectStats: [],
    });
  }
});

// ==========================================
// Projects Engine CRUD Routers
// ==========================================
router.get("/projects", protectRoute, projectController.getAllProjects);
router.get("/projects/new", protectRoute, projectController.renderCreateForm);
router.post("/projects", protectRoute, projectController.storeProject);
router.get(
  "/projects/:id/edit",
  protectRoute,
  projectController.renderEditForm,
);
router.post(
  "/projects/:id/update",
  protectRoute,
  projectController.updateProject,
);
router.post(
  "/projects/:id/delete",
  protectRoute,
  projectController.deleteProject,
);

// ==========================================
// Organizations Engine CRUD Routers
// ==========================================
router.get(
  "/organizations",
  protectRoute,
  organizationController.getAllOrganizations,
);
router.get(
  "/organizations/new",
  protectRoute,
  organizationController.renderCreateForm,
);
router.post(
  "/organizations",
  protectRoute,
  organizationController.storeOrganization,
);
router.get(
  "/organizations/:id/edit",
  protectRoute,
  organizationController.renderEditForm,
);
router.post(
  "/organizations/:id/update",
  protectRoute,
  organizationController.updateOrganization,
);
router.post(
  "/organizations/:id/delete",
  protectRoute,
  organizationController.deleteOrganization,
);

// ==========================================
// Experiences Engine CRUD Routers
// ==========================================
router.get(
  "/experiences",
  protectRoute,
  experienceController.getAllExperiences,
);
router.get(
  "/experiences/new",
  protectRoute,
  experienceController.renderCreateForm,
);
router.post("/experiences", protectRoute, experienceController.storeExperience);
router.get(
  "/experiences/:id/edit",
  protectRoute,
  experienceController.renderEditForm,
);
router.post(
  "/experiences/:id/update",
  protectRoute,
  experienceController.updateExperience,
);
router.post(
  "/experiences/:id/delete",
  protectRoute,
  experienceController.deleteExperience,
);

// ==========================================
// Achievements Engine CRUD Routers
// ==========================================
router.get(
  "/achievements",
  protectRoute,
  achievementController.getAllAchievements,
);
router.get(
  "/achievements/new",
  protectRoute,
  achievementController.renderCreateForm,
);
router.post(
  "/achievements",
  protectRoute,
  achievementController.storeAchievement,
);
router.get(
  "/achievements/:id/edit",
  protectRoute,
  achievementController.renderEditForm,
);
router.post(
  "/achievements/:id/update",
  protectRoute,
  achievementController.updateAchievement,
);
router.post(
  "/achievements/:id/delete",
  protectRoute,
  achievementController.deleteAchievement,
);

// ==========================================
// Certificates Engine CRUD Routers
// ==========================================
router.get(
  "/certificates",
  protectRoute,
  certificateController.getAllCertificates,
);
router.get(
  "/certificates/new",
  protectRoute,
  certificateController.renderCreateForm,
);
router.post(
  "/certificates",
  protectRoute,
  certificateController.upload.single("certificate_img"),
  certificateController.storeCertificate,
);
router.get(
  "/certificates/:id/edit",
  protectRoute,
  certificateController.renderEditForm,
);
router.post(
  "/certificates/:id/update",
  protectRoute,
  certificateController.upload.single("certificate_img"),
  certificateController.updateCertificate,
);
router.post(
  "/certificates/:id/delete",
  protectRoute,
  certificateController.deleteCertificate,
);

// Tambahkan di web.js
router.post(
  "/profile/upload",
  protectRoute,
  authController.uploadProfile.single("avatar"),
  authController.updateProfilePhoto,
);

// ==========================================
// Skills Registry CRUD Routers
// ==========================================
router.get("/skills", protectRoute, skillController.getAllSkills);
router.get("/skills/new", protectRoute, skillController.renderCreateForm);
router.post("/skills", protectRoute, skillController.storeSkill);
router.get("/skills/:id/edit", protectRoute, skillController.renderEditForm);
router.post("/skills/:id/update", protectRoute, skillController.updateSkill);
router.post("/skills/:id/delete", protectRoute, skillController.deleteSkill);

module.exports = router;
