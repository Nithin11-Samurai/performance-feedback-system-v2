/**
 * User model.
 * Every SQL query touching the `users` table lives here so controllers/
 * services never write raw SQL themselves — keeps query shape consistent
 * and makes future schema changes a one-file fix.
 */
const { query } = require('../config/db');

const PUBLIC_COLUMNS = `
  id, employee_code, first_name, last_name, email, role, job_title,
  department, manager_id, date_of_joining, is_active, avatar_url,
  phone, address, emergency_contact_name, emergency_contact_phone,
  created_at, updated_at
`;

async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

// Includes password_hash — only for internal auth checks, never returned to clients.
async function findByIdWithPassword(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByEmployeeCode(employeeCode) {
  const result = await query('SELECT id FROM users WHERE employee_code = $1', [employeeCode]);
  return result.rows[0] || null;
}

async function create({
  employeeCode,
  firstName,
  lastName,
  email,
  passwordHash,
  role,
  jobTitle,
  department,
  managerId,
  dateOfJoining,
}) {
  const result = await query(
    `INSERT INTO users
      (employee_code, first_name, last_name, email, password_hash, role, job_title, department, manager_id, date_of_joining)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${PUBLIC_COLUMNS}`,
    [employeeCode, firstName, lastName, email, passwordHash, role, jobTitle, department, managerId || null, dateOfJoining || null]
  );
  return result.rows[0];
}

async function updateProfile(id, fields) {
  // Build a dynamic SET clause from whatever fields were provided.
  const allowed = [
    'employee_code', 'first_name', 'last_name', 'email', 'job_title', 'department',
    'manager_id', 'date_of_joining', 'avatar_url', 'is_active', 'role',
    'phone', 'address', 'emergency_contact_name', 'emergency_contact_phone',
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
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING ${PUBLIC_COLUMNS}`,
    values
  );
  return result.rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
}

async function listAll({ role, department, managerId, search, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (role) {
    conditions.push(`role = $${idx}`);
    values.push(role);
    idx += 1;
  }
  if (department) {
    conditions.push(`department = $${idx}`);
    values.push(department);
    idx += 1;
  }
  if (managerId) {
    conditions.push(`manager_id = $${idx}`);
    values.push(managerId);
    idx += 1;
  }
  if (search) {
    conditions.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit, offset);

  const result = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ${whereClause}
     ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  );
  return result.rows;
}

async function countAll({ role, department, managerId, search } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (role) {
    conditions.push(`role = $${idx}`);
    values.push(role);
    idx += 1;
  }
  if (department) {
    conditions.push(`department = $${idx}`);
    values.push(department);
    idx += 1;
  }
  if (managerId) {
    conditions.push(`manager_id = $${idx}`);
    values.push(managerId);
    idx += 1;
  }
  if (search) {
    conditions.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(`SELECT COUNT(*)::int AS count FROM users ${whereClause}`, values);
  return result.rows[0].count;
}

/**
 * Global search (Feature 8) — searches across employee code, name, email,
 * department, job title, role, status, and manager name in one query.
 * Broader than listAll's directory search (which only matches name/email).
 */
async function globalSearch(term, { managerId, limit = 20 } = {}) {
  const conditions = [
    `(u.employee_code ILIKE $1
      OR u.first_name ILIKE $1
      OR u.last_name ILIKE $1
      OR (u.first_name || ' ' || u.last_name) ILIKE $1
      OR u.email ILIKE $1
      OR u.department ILIKE $1
      OR u.job_title ILIKE $1
      OR u.role ILIKE $1
      OR (m.first_name || ' ' || m.last_name) ILIKE $1
      OR (CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END) ILIKE $1)`,
  ];
  const values = [`%${term}%`];
  let idx = 2;

  // Managers only ever search within their own team.
  if (managerId) {
    conditions.push(`u.manager_id = $${idx}`);
    values.push(managerId);
    idx += 1;
  }

  values.push(limit);

  const result = await query(
    `SELECT ${PUBLIC_COLUMNS.split(',').map((c) => `u.${c.trim()}`).join(', ')},
            m.first_name AS manager_first_name, m.last_name AS manager_last_name
     FROM users u
     LEFT JOIN users m ON m.id = u.manager_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.first_name
     LIMIT $${idx}`,
    values
  );
  return result.rows;
}

async function getDirectReports(managerId) {
  const result = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE manager_id = $1 ORDER BY first_name`, [managerId]);
  return result.rows;
}

/**
 * Bulk-reassign many employees to a manager (or remove them from any
 * manager if managerId is null) in a single statement. Feature 5.
 */
async function bulkAssignManager(employeeIds, managerId) {
  const result = await query(
    `UPDATE users SET manager_id = $1 WHERE id = ANY($2::uuid[]) RETURNING ${PUBLIC_COLUMNS}`,
    [managerId, employeeIds]
  );
  return result.rows;
}

module.exports = {
  findByEmail,
  findById,
  findByIdWithPassword,
  findByEmployeeCode,
  create,
  updateProfile,
  updatePassword,
  listAll,
  countAll,
  getDirectReports,
  bulkAssignManager,
  globalSearch,
};
