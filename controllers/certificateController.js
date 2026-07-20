const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Konfigurasi Penyimpanan Gambar menggunakan Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./public/uploads/certificates";
    // Buat folder jika belum ada
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Format nama file: certificates-timestamp.extensi
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname),
    );
  },
});

// Filter agar hanya menerima file gambar (jpg, jpeg, png)
const imageFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Please upload only images (png, jpg, jpeg)."), false);
  }
};

exports.upload = multer({ storage: storage, fileFilter: imageFilter });

// READ - Get All Certificates
exports.getAllCertificates = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    let query = `
            SELECT c.*, u.username 
            FROM certificates c 
            INNER JOIN users u ON c.user_id = u.id 
            WHERE c.user_id = ?
        `;
    let queryParams = [userId];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.issuing_organization LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    let countQuery = query.replace("c.*, u.username", "COUNT(*) as total");
    const [totalRowsResult] = await db.query(countQuery, queryParams);
    const totalRows = totalRowsResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    query += ` ORDER BY c.issue_date DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [certificates] = await db.query(query, queryParams);

    res.render("certificates/index", {
      certificates,
      search,
      page,
      totalPages,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Database Pipeline Fault: " + err.message);
  }
};

// CREATE - Render Form
exports.renderCreateForm = (req, res) => {
  res.render("certificates/create");
};

// STORE - Process Insert with Image Upload
exports.storeCertificate = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  const {
    name,
    issuing_organization,
    issue_date,
    expiration_date,
    credential_id,
  } = req.body;

  // Ambil nama file jika ada file yang diunggah
  const certificate_img = req.file ? req.file.filename : null;

  try {
    await db.query(
      "INSERT INTO certificates (user_id, name, issuing_organization, issue_date, expiration_date, credential_id, certificate_img) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        name,
        issuing_organization,
        issue_date,
        expiration_date || null,
        credential_id || null,
        certificate_img,
      ],
    );
    res.redirect(
      "/certificates?success=Certificate asset successfully deployed and stored in cluster storage.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// EDIT - Render Form
exports.renderEditForm = async (req, res) => {
  try {
    const [certificate] = await db.query(
      "SELECT * FROM certificates WHERE id = ?",
      [req.params.id],
    );
    if (certificate.length === 0)
      return res.status(404).send("Asset Not Found");
    res.render("certificates/edit", { certificate: certificate[0] });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// UPDATE - Process Update with Optional Image Re-upload
exports.updateCertificate = async (req, res) => {
  const {
    name,
    issuing_organization,
    issue_date,
    expiration_date,
    credential_id,
  } = req.body;
  let certificate_img = req.body.old_certificate_img;

  // Jika user mengunggah foto baru, ganti nama filenya
  if (req.file) {
    certificate_img = req.file.filename;
    // Opsional: Anda bisa menghapus file lama di sini dengan fs.unlink jika ingin hemat storage
  }

  try {
    await db.query(
      "UPDATE certificates SET name = ?, issuing_organization = ?, issue_date = ?, expiration_date = ?, credential_id = ?, certificate_img = ? WHERE id = ?",
      [
        name,
        issuing_organization,
        issue_date,
        expiration_date || null,
        credential_id || null,
        certificate_img,
        req.params.id,
      ],
    );
    res.redirect(
      "/certificates?success=Certificate configurations re-indexed.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// DELETE - Process Purge and Delete File
exports.deleteCertificate = async (req, res) => {
  try {
    // Ambil info file dulu sebelum dihapus dari database
    const [cert] = await db.query(
      "SELECT certificate_img FROM certificates WHERE id = ?",
      [req.params.id],
    );

    if (cert.length > 0 && cert[0].certificate_img) {
      const filePath = `./public/uploads/certificates/${cert[0].certificate_img}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Hapus file fisiknya dari Docker Storage
      }
    }

    await db.query("DELETE FROM certificates WHERE id = ?", [req.params.id]);
    res.redirect(
      "/certificates?success=Certificate asset wiped from core infrastructure.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};
