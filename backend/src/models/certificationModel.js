/**
 * Certification model — all SQL for the `certifications` table.
 */
const { query } = require('../config/db');

async function listByUser(userId) {
  const result = await query(
    'SELECT * FROM certifications WHERE user_id = $1 ORDER BY issue_date DESC NULLS LAST, created_at DESC',
    [userId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM certifications WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create({
  userId,
  name,
  issuingOrganization,
  issueDate,
  expiryDate,
  credentialId,
  credentialUrl,
  filePath,
  fileOriginalName,
}) {
  const result = await query(
    `INSERT INTO certifications
      (user_id, name, issuing_organization, issue_date, expiry_date, credential_id, credential_url, file_path, file_original_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      name,
      issuingOrganization || null,
      issueDate || null,
      expiryDate || null,
      credentialId || null,
      credentialUrl || null,
      filePath || null,
      fileOriginalName || null,
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const allowed = [
    'name', 'issuing_organization', 'issue_date', 'expiry_date', 'credential_id', 'credential_url',
    'file_path', 'file_original_name',
  ];
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx += 1;
    }
  }
  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const result = await query(
    `UPDATE certifications SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM certifications WHERE id = $1 RETURNING file_path', [id]);
  return result.rows[0] || null;
}

module.exports = { listByUser, findById, create, update, remove };
