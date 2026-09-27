const API_BASE = '/api';

class ApiService {
  getToken() {
    return localStorage.getItem('hackathon_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('hackathon_token', token);
    } else {
      localStorage.removeItem('hackathon_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      let json;
      try {
        json = await response.json();
      } catch (e) {
        json = null;
      }

      if (!response.ok) {
        let errorMessage = json?.message || `HTTP Error ${response.status}: ${response.statusText}`;
        if (json?.errors && typeof json.errors === 'object') {
          const fieldMsgs = Object.values(json.errors).filter(Boolean);
          if (fieldMsgs.length > 0) {
            errorMessage = fieldMsgs.join('. ');
          }
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        error.errors = json?.errors;
        throw error;
      }

      return json;
    } catch (err) {
      throw err;
    }
  }

  // Auth
  async register(data) {
    const res = await this.request('/auth/register', { method: 'POST', body: data });
    if (res?.data?.token) this.setToken(res.data.token);
    return res;
  }

  async login(data) {
    const res = await this.request('/auth/login', { method: 'POST', body: data });
    if (res?.data?.token) this.setToken(res.data.token);
    return res;
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Events
  async getEvents() {
    return this.request('/events');
  }

  async getEventById(id) {
    return this.request(`/events/${id}`);
  }

  async createEvent(data) {
    return this.request('/events', { method: 'POST', body: data });
  }

  async updateEvent(id, data) {
    return this.request(`/events/${id}`, { method: 'PUT', body: data });
  }

  async addCriterion(eventId, data) {
    return this.request(`/events/${eventId}/criteria`, { method: 'POST', body: data });
  }

  async assignJudge(eventId, judgeEmail, trackIds = []) {
    return this.request(`/events/${eventId}/judges`, {
      method: 'POST',
      body: { judgeEmail, trackIds },
    });
  }

  async getEventJudges(eventId) {
    return this.request(`/events/${eventId}/judges`);
  }

  async updateJudgeStatus(eventId, status) {
    return this.request(`/judging/${eventId}/judges/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  async publishLeaderboard(eventId, isLeaderboardPublished = true) {
    return this.request(`/events/${eventId}/publish-leaderboard`, {
      method: 'POST',
      body: { isLeaderboardPublished },
    });
  }

  // Teams
  async createTeam(data) {
    return this.request('/teams', { method: 'POST', body: data });
  }

  async joinTeam(inviteCode) {
    return this.request('/teams/join', { method: 'POST', body: { inviteCode } });
  }

  async getInviteLink(teamId) {
    return this.request(`/teams/${teamId}/invite-link`);
  }

  async joinTeamByLink(token) {
    return this.request('/teams/join-link', { method: 'POST', body: { token } });
  }

  async getMyTeams() {
    return this.request('/teams/my-teams');
  }

  async getTeamById(id) {
    return this.request(`/teams/${id}`);
  }

  async leaveTeam(id) {
    return this.request(`/teams/${id}/leave`, { method: 'POST' });
  }

  // Submissions
  async submitProject(teamId, data) {
    return this.request(`/submissions/team/${teamId}`, { method: 'POST', body: data });
  }

  async getSubmissionById(id) {
    return this.request(`/submissions/${id}`);
  }

  async getSubmissionsByEvent(eventId) {
    return this.request(`/submissions/event/${eventId}`);
  }

  async getGallery(eventId) {
    return this.request(`/submissions/gallery/${eventId}`);
  }

  // Judging
  async getJudgeQueue() {
    return this.request('/judging/queue');
  }

  async getJudgeScores(judge) {
    const q = judge ? `?judge=${encodeURIComponent(judge)}` : '';
    return this.request(`/judge/scores${q}`);
  }

  async getSubmissionScores(submissionId) {
    return this.request(`/judging/scores/${submissionId}`);
  }

  async submitScores(submissionId, scores) {
    return this.request(`/judging/score/${submissionId}`, { method: 'POST', body: { scores } });
  }

  async getLeaderboard(eventId) {
    return this.request(`/judging/leaderboard/${eventId}`);
  }

  async getJudgingProgress(eventId) {
    return this.request(`/events/${eventId}/judging/progress`);
  }

  async runNormalization(eventId) {
    return this.request(`/events/${eventId}/judging/normalize`, { method: 'POST' });
  }

  async getJudgeAssignments(eventId) {
    return this.request(`/events/${eventId}/judge-assignments`);
  }

  async batchAssignJudges(eventId, data) {
    return this.request(`/events/${eventId}/judge-assignments/batch`, { method: 'POST', body: data });
  }

  async autoAssignJudges(eventId, data) {
    return this.request(`/events/${eventId}/judge-assignments/auto`, { method: 'POST', body: data });
  }

  async removeJudgeAssignment(eventId, assignmentId) {
    return this.request(`/events/${eventId}/judge-assignments/${assignmentId}`, { method: 'DELETE' });
  }

  async getAuditLogs(eventId, filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/events/${eventId}/audit-logs?${params.toString()}`);
  }

  async downloadJudgingCsv(eventId, type = 'results') {
    const token = this.getToken();
    const url = `${API_BASE}/events/${eventId}/judging/export.csv?type=${type}`;
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to export CSV: ${response.statusText}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `event-${eventId}-${type}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const api = new ApiService();
export default api;
