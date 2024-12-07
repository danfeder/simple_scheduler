import { OpenAPIV3 } from 'openapi-types';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'School Class Scheduler API',
    version: '1.0.0',
    description: 'API for managing school class schedules and rotations'
  },
  servers: [
    {
      url: '/api',
      description: 'API endpoint'
    }
  ],
  components: {
    schemas: {
      Class: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          classNumber: { type: 'string' },
          grade: { 
            type: 'string',
            enum: ['Pre-K', 'K', '1', '2', '3', '4', '5', 'multiple']
          },
          defaultConflicts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dayOfWeek: { type: 'integer', minimum: 1, maximum: 5 },
                period: { type: 'integer', minimum: 1, maximum: 8 }
              }
            }
          },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['classNumber', 'grade', 'defaultConflicts']
      },
      Rotation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date-time' },
          status: { 
            type: 'string',
            enum: ['draft', 'active', 'completed']
          },
          schedule: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                classId: { type: 'string', format: 'uuid' },
                assignedDate: { type: 'string', format: 'date-time' },
                period: { type: 'integer', minimum: 1, maximum: 8 }
              }
            }
          },
          additionalConflicts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                classId: { type: 'string', format: 'uuid' },
                dayOfWeek: { type: 'integer', minimum: 1, maximum: 5 },
                period: { type: 'integer', minimum: 1, maximum: 8 }
              }
            }
          },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['startDate']
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'object' }
        }
      }
    }
  },
  paths: {
    '/classes': {
      get: {
        summary: 'Get all classes',
        parameters: [
          {
            name: 'active',
            in: 'query',
            schema: { type: 'boolean' }
          },
          {
            name: 'grade',
            in: 'query',
            schema: { 
              type: 'string',
              enum: ['Pre-K', 'K', '1', '2', '3', '4', '5', 'multiple']
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of classes',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Class' }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a new class',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Class' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Created class',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Class' }
              }
            }
          }
        }
      }
    },
    '/rotations': {
      get: {
        summary: 'Get all rotations',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          }
        ],
        responses: {
          '200': {
            description: 'Paginated list of rotations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Rotation' }
                    },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/rotations/{id}/generate': {
      post: {
        summary: 'Generate a schedule for a rotation',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'Generated schedule',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Rotation' }
              }
            }
          }
        }
      }
    }
  }
}; 