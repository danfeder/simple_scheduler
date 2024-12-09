const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Classes API
export const classesApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/classes`);
    if (!response.ok) throw new Error('Failed to fetch classes');
    return response.json();
  },

  create: async (classData: any) => {
    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData),
    });
    if (!response.ok) throw new Error('Failed to create class');
    return response.json();
  },

  update: async (id: string, classData: any) => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData),
    });
    if (!response.ok) throw new Error('Failed to update class');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete class');
    return true;
  },

  importPDF: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/classes/import`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to import schedule');
    return response.json();
  },

  getConflicts: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}/conflicts`);
    if (!response.ok) throw new Error('Failed to fetch conflicts');
    return response.json();
  },
};

// Constraints API
export const constraintsApi = {
  get: async () => {
    const response = await fetch(`${API_BASE_URL}/constraints`);
    if (!response.ok) throw new Error('Failed to fetch constraints');
    return response.json();
  },

  update: async (constraints: any) => {
    const response = await fetch(`${API_BASE_URL}/constraints`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(constraints),
    });
    if (!response.ok) throw new Error('Failed to update constraints');
    return response.json();
  },

  validate: async (constraints: any) => {
    const response = await fetch(`${API_BASE_URL}/constraints/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(constraints),
    });
    if (!response.ok) throw new Error('Failed to validate constraints');
    return response.json();
  },

  getTemplates: async () => {
    const response = await fetch(`${API_BASE_URL}/constraints/templates`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },
};

// Schedule API
export const scheduleApi = {
  generate: async (startDate: Date) => {
    const response = await fetch(`${API_BASE_URL}/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate }),
    });
    if (!response.ok) throw new Error('Failed to start generation');
    return response.json();
  },

  get: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}`);
    if (!response.ok) throw new Error('Failed to fetch schedule');
    return response.json();
  },

  getCurrent: async () => {
    const response = await fetch(`${API_BASE_URL}/schedule/current`);
    if (!response.ok) throw new Error('Failed to fetch current schedule');
    return response.json();
  },

  optimize: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}/optimize`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to optimize schedule');
    return response.json();
  },

  getStatus: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/status/${id}`);
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  updateClass: async (scheduleId: string, classId: string, updates: { dayOfWeek: number; period: number }) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}/class/${classId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update class schedule');
    return response.json();
  },

  checkConflicts: async (scheduleId: string, classId: string, dayOfWeek: number, period: number) => {
    const response = await fetch(
      `${API_BASE_URL}/schedule/${scheduleId}/conflicts?classId=${classId}&dayOfWeek=${dayOfWeek}&period=${period}`
    );
    if (!response.ok) throw new Error('Failed to check conflicts');
    return response.json();
  },

  unscheduleClass: async (scheduleId: string, classId: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}/class/${classId}/unschedule`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to unschedule class');
    return response.json();
  },

  rescheduleClass: async (scheduleId: string, classId: string, original: { dayOfWeek: number; period: number }) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}/class/${classId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(original),
    });
    if (!response.ok) throw new Error('Failed to reschedule class');
    return response.json();
  },
}; 