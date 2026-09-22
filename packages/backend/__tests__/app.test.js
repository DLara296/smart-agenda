const request = require('supertest');
const { app, db } = require('../src/app');

// Close the database connection after all tests
afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('Todo API Endpoints', () => {
  describe('GET /api/todos', () => {
    it('should return array of todos', async () => {
      const response = await request(app).get('/api/todos');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('completed');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    it('should return todos ordered by creation date (newest first)', async () => {
      const response = await request(app).get('/api/todos');
      expect(response.status).toBe(200);
      if (response.body.length > 1) {
        const firstCreated = new Date(response.body[0].createdAt);
        const secondCreated = new Date(response.body[1].createdAt);
        expect(firstCreated.getTime()).toBeGreaterThanOrEqual(secondCreated.getTime());
      }
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return single todo by ID', async () => {
      const listResponse = await request(app).get('/api/todos');
      const todoId = listResponse.body[0].id;

      const response = await request(app).get(`/api/todos/${todoId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', todoId);
      expect(response.body).toHaveProperty('title');
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).get('/api/todos/999999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app).get('/api/todos/invalid');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/todos', () => {
    it('should create new todo with title only', async () => {
      const response = await request(app).post('/api/todos').send({ title: 'Test Todo' });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Todo');
      expect(response.body.completed).toBe(0);
      expect(response.body.dueDate).toBeNull();
    });

    it('should create new todo with title and due date', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Urgent Task', dueDate: '2025-12-25' });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Urgent Task');
      expect(response.body.dueDate).toBe('2025-12-25');
      expect(response.body.completed).toBe(0);
    });

    it('should trim title whitespace', async () => {
      const response = await request(app).post('/api/todos').send({ title: '  Trimmed Todo  ' });
      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Trimmed Todo');
    });

    it('should return 400 if title is empty', async () => {
      const response = await request(app).post('/api/todos').send({ title: '' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app).post('/api/todos').send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if title exceeds 255 characters', async () => {
      const longTitle = 'a'.repeat(256);
      const response = await request(app).post('/api/todos').send({ title: longTitle });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update todo title', async () => {
      const createResponse = await request(app).post('/api/todos').send({ title: 'Original Title' });
      const todoId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ title: 'Updated Title' });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe('Updated Title');
      expect(updateResponse.body.id).toBe(todoId);
    });

    it('should update todo due date', async () => {
      const createResponse = await request(app).post('/api/todos').send({ title: 'Task' });
      const todoId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ dueDate: '2025-12-31' });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.dueDate).toBe('2025-12-31');
    });

    it('should update both title and due date', async () => {
      const createResponse = await request(app).post('/api/todos').send({ title: 'Task' });
      const todoId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ title: 'New Title', dueDate: '2026-01-01' });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe('New Title');
      expect(updateResponse.body.dueDate).toBe('2026-01-01');
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .put('/api/todos/999999')
        .send({ title: 'New Title' });
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .put('/api/todos/invalid')
        .send({ title: 'New Title' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if title is empty', async () => {
      const createResponse = await request(app).post('/api/todos').send({ title: 'Task' });
      const todoId = createResponse.body.id;

      const response = await request(app).put(`/api/todos/${todoId}`).send({ title: '' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/todos/:id/toggle', () => {
    it('should toggle todo from incomplete to complete', async () => {
      const createResponse = await request(app).post('/api/todos').send({ title: 'Task to Complete' });
      const todoId = createResponse.body.id;

      const toggleResponse = await request(app).patch(`/api/todos/${todoId}/toggle`);
      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.body.completed).toBe(1);
    });

    it('should toggle todo from complete to incomplete', async () => {
      const createResponse = await request(app).post('/api/todos').send({ title: 'Task' });
      const todoId = createResponse.body.id;

      await request(app).patch(`/api/todos/${todoId}/toggle`);

      const toggleResponse = await request(app).patch(`/api/todos/${todoId}/toggle`);
      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.body.completed).toBe(0);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).patch('/api/todos/999999/toggle');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app).patch('/api/todos/invalid/toggle');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete existing todo', async () => {
      const createResponse = await request(app).post('/api/todos').send({ title: 'Todo to Delete' });
      const todoId = createResponse.body.id;

      const deleteResponse = await request(app).delete(`/api/todos/${todoId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message');
      expect(deleteResponse.body.id).toBe(todoId);

      const getResponse = await request(app).get(`/api/todos/${todoId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app).delete('/api/todos/999999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app).delete('/api/todos/invalid');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Backward compatibility tests for old /api/items endpoints
  describe('GET /api/items (backward compatibility)', () => {
    it('should return array of items', async () => {
      const response = await request(app).get('/api/items');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/items (backward compatibility)', () => {
    it('should create new item', async () => {
      const response = await request(app).post('/api/items').send({ name: 'Test Item' });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Item');
    });
  });

  describe('DELETE /api/items/:id (backward compatibility)', () => {
    it('should delete existing item', async () => {
      const createResponse = await request(app).post('/api/items').send({ name: 'Item to Delete' });
      const itemId = createResponse.body.id;

      const deleteResponse = await request(app).delete(`/api/items/${itemId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message');
    });
  });
});