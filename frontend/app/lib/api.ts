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
import { Schedule, ScheduleConstraints } from '../../../shared/types/schedule';

interface Rotation {
  id: string;
  startDate: string;
  schedule: Array<{
    classId: string;
    assignedDate: string;
    period: number;
  }>;
  status: 'draft' | 'active' | 'completed';
  additionalConflicts: any[];
  createdAt: string;
  updatedAt: string;
}

export const scheduleApi = {
  generate: async (startDate: Date): Promise<Rotation> => {
    const response = await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startDate: startDate.toISOString() }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to generate schedule');
    }

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ maxTimeSeconds: 30 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to optimize schedule');
    }

    return response.json();
  },

  getStatus: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/status/${id}`);
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  updateClass: async (version: string, classId: string, update: { dayOfWeek: number; period: number }): Promise<Schedule> => {
    const response = await fetch(`/api/schedule/${version}/class/${classId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      throw new Error('Failed to update class');
    }

    return response.json();
  },

  checkConflicts: async (version: string, classId: string, dayOfWeek: number, period: number) => {
    const response = await fetch(`/api/schedule/${version}/conflicts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ classId, dayOfWeek, period }),
    });

    if (!response.ok) {
      throw new Error('Failed to check conflicts');
    }

    return response.json();
  },

  unscheduleClass: async (scheduleId: string, classId: string) => {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}/class/${classId}/unschedule`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to unschedule class');
    return response.json();
  },

  rescheduleClass: async (version: string, classId: string, update: { dayOfWeek: number; period: number }): Promise<Schedule> => {
    const response = await fetch(`/api/schedule/${version}/class/${classId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      throw new Error('Failed to reschedule class');
    }

    return response.json();
  }
}; 