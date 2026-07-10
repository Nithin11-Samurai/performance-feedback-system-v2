/**
 * One-on-one notes model — "Internal Notes" / Meeting History.
 * Every query here is reachable ONLY through Admin/HR-gated routes
 * (enforced in noteRoutes.js + noteService.js). There is no code path
 * anywhere in the app that lets an employee or manager query this table.
 */
const { query } = require('../config/db');

/**
 * @param {object} [filters] - { search, startDate, endDate } for Feature 3's
 *   search/filter requirement. All optional.
 */
async function listByEmployee(employeeId, filters = {}) {
  const conditions = ['n.employee_id = $1'];
  const values = [employeeId];
  let idx = 2;

  if (filters.search) {
    conditions.push(`(n.title ILIKE $${idx} OR n.discussion ILIKE $${idx} OR n.action_items ILIKE $${idx} OR n.note_text ILIKE $${idx})`);
    values.push(`%${filters.search}%`);
    idx += 1;
  }
  if (filters.startDate) {
    conditions.push(`n.meeting_date >= $${idx}`);
    values.push(filters.startDate);
    idx += 1;
  }
  if (filters.endDate) {
    conditions.push(`n.meeting_date <= $${idx}`);
    values.push(filters.endDate);
    idx += 1;
  }

  const result = await query(
    `SELECT n.*, u.first_name AS uploaded_by_first_name, u.last_name AS uploaded_by_last_name
     FROM one_on_one_notes n
     LEFT JOIN users u ON u.id = n.uploaded_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY n.meeting_date DESC, n.created_at DESC`,
    values
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM one_on_one_notes WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create({
  employeeId,
  uploadedBy,
  meetingDate,
  title,
  noteText,
  discussion,
  actionItems,
  followUpDate,
  filePath,
  fileOriginalName,
}) {
  const result = await query(
    `INSERT INTO one_on_one_notes
      (employee_id, uploaded_by, meeting_date, title, note_text, discussion, action_items, follow_up_date, file_path, file_original_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      employeeId,
      uploadedBy,
      meetingDate,
      title || null,
      noteText || null,
      discussion || null,
      actionItems || null,
      followUpDate || null,
      filePath || null,
      fileOriginalName || null,
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const allowed = [
    'meeting_date', 'title', 'note_text', 'discussion', 'action_items', 'follow_up_date',
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
    `UPDATE one_on_one_notes SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM one_on_one_notes WHERE id = $1 RETURNING file_path', [id]);
  return result.rows[0] || null;
}

module.exports = { listByEmployee, findById, create, update, remove };
