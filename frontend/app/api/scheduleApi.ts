const API_BASE_URL = '/api'; // Assuming you're using Next.js API routes

export const scheduleApi = {
  generate: async (startDate: Date) => {
    const response = await fetch(`${API_BASE_URL}/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: startDate.toISOString() }),
    });
    if (!response.ok) throw new Error('Failed to start generation');
    return response.json();
  },

  getStatus: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/status/${id}`);
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  get: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}`);
    if (!response.ok) throw new Error('Failed to fetch schedule');
    return response.json();
  },

  optimize: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}/optimize`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to optimize schedule');
    return response.json();
  },
};

