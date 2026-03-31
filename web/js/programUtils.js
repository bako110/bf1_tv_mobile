const API_BASE = 'https://bf1.fly.dev/api/v1';

function getHeaders() {
  const token = localStorage.getItem('bf1_token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function get(path) {
  const r = await fetch(`${API_BASE}${path}`, { headers: getHeaders() });
  if (!r.ok) {
    const err = new Error('Erreur API');
    err.status = r.status;
    throw err;
  }
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = new Error('Erreur API');
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export async function getMyReminders(status = null, upcomingOnly = false) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (upcomingOnly) params.set('upcoming_only', 'true');
  const qs = params.toString();
  return get(`/programs/reminders/my${qs ? `?${qs}` : ''}`);
}

export async function createReminder(programId, { minutes_before = 15, reminder_type = 'push' } = {}) {
  return post(`/programs/${programId}/reminders`, { program_id: programId, minutes_before, reminder_type });
}

export async function getProgramWeek(weeksAhead = 0, type = null) {
  const params = new URLSearchParams();
  params.append('weeks_ahead', weeksAhead);
  if (type) params.append('type', type);
  return get(`/programs/grid/weekly?${params.toString()}`).catch(() => ({ days: [] }));
}

export async function getProgramGrid(startDate = null, endDate = null, type = null) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (type) params.append('type', type);
  return get(`/programs/grid/daily?${params.toString()}`).catch(() => ({ days: [] }));
}

export async function getPrograms() {
  return get('/programs').catch(() => []);
}

export async function getMyLikes(contentType) {
  try {
    const res = await get(`/likes/my-likes?content_type=${encodeURIComponent(contentType)}`);
    return Array.isArray(res) ? res : (res?.items || []);
  } catch { return []; }
}

export async function toggleLike(contentType, contentId) {
  return post('/likes/toggle', { content_type: contentType, content_id: contentId });
}
