const db = require("../config/db");

// READ - Get All Organizations
exports.getAllOrganizations = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1; // Locked to dummy user
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    // Base Query
    let query = `
            SELECT o.*, u.username 
            FROM organizations o 
            INNER JOIN users u ON o.user_id = u.id 
            WHERE o.user_id = ?
        `;
    let queryParams = [userId];

    if (search) {
      query += ` AND o.org_name LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    // Hitung Total untuk Paginasi
    let countQuery = query.replace("o.*, u.username", "COUNT(*) as total");
    const [totalRowsResult] = await db.query(countQuery, queryParams);
    const totalRows = totalRowsResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    // Sorting & Limit
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [organizations] = await db.query(query, queryParams);

    res.render("organizations/index", {
      organizations,
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
  res.render("organizations/create");
};

// STORE - Process Insert
exports.storeOrganization = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  const { org_name, role, industry, description } = req.body;

  if (!org_name || !role) {
    return res.redirect(
      "/organizations/new?error=Organization Name and Role are required.",
    );
  }

  try {
    await db.query(
      "INSERT INTO organizations (user_id, org_name, role, industry, description) VALUES (?, ?, ?, ?, ?)",
      [userId, org_name, role, industry || null, description || null],
    );
    res.redirect(
      "/organizations?success=Organization record deployed successfully.",
    );
  } catch (err) {
    res.redirect(`/organizations/new?error=${encodeURIComponent(err.message)}`);
  }
};

// EDIT - Render Form
exports.renderEditForm = async (req, res) => {
  try {
    const [organization] = await db.query(
      "SELECT * FROM organizations WHERE id = ?",
      [req.params.id],
    );
    if (organization.length === 0)
      return res.status(404).send("Asset Not Found");
    res.render("organizations/edit", { organization: organization[0] });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// UPDATE - Process Update
exports.updateOrganization = async (req, res) => {
  const { org_name, role, industry, description } = req.body;
  try {
    await db.query(
      "UPDATE organizations SET org_name = ?, role = ?, industry = ?, description = ? WHERE id = ?",
      [org_name, role, industry, description, req.params.id],
    );
    res.redirect("/organizations?success=Organization parameters updated.");
  } catch (err) {
    res.redirect(
      `/organizations/${req.params.id}/edit?error=${encodeURIComponent(err.message)}`,
    );
  }
};

// DELETE - Process Delete
exports.deleteOrganization = async (req, res) => {
  try {
    await db.query("DELETE FROM organizations WHERE id = ?", [req.params.id]);
    res.redirect("/organizations?success=Organization record purged.");
  } catch (err) {
    res.redirect(`/organizations?error=${encodeURIComponent(err.message)}`);
  }
};
