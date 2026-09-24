const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    dueDate TEXT,
    completed BOOLEAN DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some initial data
const initialTodos = [
  { title: 'Learn React', dueDate: '2025-12-15', completed: 0 },
  { title: 'Build TODO app', dueDate: '2025-12-31', completed: 0 },
  { title: 'Master Copilot', dueDate: null, completed: 1 }
];

const insertStmt = db.prepare('INSERT INTO todos (title, dueDate, completed) VALUES (?, ?, ?)');

initialTodos.forEach(todo => {
  insertStmt.run(todo.title, todo.dueDate, todo.completed);
});

console.log('In-memory database initialized with sample todos');

// API Routes
app.get('/api/todos', (req, res) => {
  try {
    const todos = db.prepare('SELECT * FROM todos ORDER BY createdAt DESC').all();
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.get('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(todo);
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

app.post('/api/todos', (req, res) => {
  try {
    const { title, dueDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Todo title is required' });
    }

    if (title.length > 255) {
      return res.status(400).json({ error: 'Todo title must not exceed 255 characters' });
    }

    const stmt = db.prepare('INSERT INTO todos (title, dueDate, completed) VALUES (?, ?, ?)');
    const result = stmt.run(title.trim(), dueDate || null, 0);
    const id = result.lastInsertRowid;

    const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    res.status(201).json(newTodo);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, dueDate } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({ error: 'Todo title must be a non-empty string' });
    }

    if (title !== undefined && title.length > 255) {
      return res.status(400).json({ error: 'Todo title must not exceed 255 characters' });
    }

    const newTitle = title !== undefined ? title.trim() : existingTodo.title;
    const newDueDate = dueDate !== undefined ? dueDate : existingTodo.dueDate;

    const stmt = db.prepare('UPDATE todos SET title = ?, dueDate = ? WHERE id = ?');
    stmt.run(newTitle, newDueDate || null, id);

    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    res.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.patch('/api/todos/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const newCompleted = existingTodo.completed ? 0 : 1;
    const stmt = db.prepare('UPDATE todos SET completed = ? WHERE id = ?');
    stmt.run(newCompleted, id);

    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    res.json(updatedTodo);
  } catch (error) {
    console.error('Error toggling todo status:', error);
    res.status(500).json({ error: 'Failed to toggle todo status' });
  }
});

app.delete('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const deleteStmt = db.prepare('DELETE FROM todos WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes > 0) {
      res.json({ message: 'Todo deleted successfully', id: parseInt(id) });
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Backward compatibility: support old items endpoints
app.get('/api/items', (req, res) => {
  try {
    const items = db.prepare('SELECT id, title as name, createdAt as created_at FROM todos ORDER BY createdAt DESC').all();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const stmt = db.prepare('INSERT INTO todos (title, dueDate, completed) VALUES (?, ?, ?)');
    const result = stmt.run(name, null, 0);
    const id = result.lastInsertRowid;

    const newItem = db.prepare('SELECT id, title as name, createdAt as created_at FROM todos WHERE id = ?').get(id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const deleteStmt = db.prepare('DELETE FROM todos WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes > 0) {
      res.json({ message: 'Item deleted successfully', id: parseInt(id) });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

function createApp({ database = ':memory:' } = {}) {
  const smartApp = express();
  const smartDb = typeof database === 'string' ? require('./db/database').createDatabase(database) : database;
  const { requireRole, requireFamilyScope } = require('./middleware/auth');
  const { createSessionService } = require('./domain/session/sessionService');
  const { createAssignmentService } = require('./domain/session/assignmentService');
  const { createAuditRepository } = require('./domain/audit/auditRepository');
  const { createFamilyService } = require('./domain/family/familyService');
  const { createInvitationService } = require('./domain/family/invitationService');
  const { createNotificationService } = require('./domain/notification/notificationService');
  const sessionService = createSessionService(smartDb);
  const assignmentService = createAssignmentService(smartDb);
  const auditRepository = createAuditRepository(smartDb);
  const familyService = createFamilyService(smartDb);
  const invitationService = createInvitationService(smartDb);
  const notificationService = createNotificationService(smartDb);

  smartApp.use(cors());
  smartApp.use(express.json());
  smartApp.get('/health', (req, res) => res.json({ status: 'ok' }));
  smartApp.get('/v1/protected/school', requireRole(['admin', 'coordinator']), (req, res) => {
    res.json({ data: { scope: 'school', role: req.user.role } });
  });
  smartApp.get('/v1/families/:id', requireRole(['guest']), requireFamilyScope, (req, res) => {
    res.json({ data: { id: req.params.id, scope: 'family' } });
  });
  smartApp.post('/v1/families', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const family = familyService.create(req.body);
      auditRepository.record({ entityType: 'family', entityId: family.id, action: 'created', actorId: req.user.role, metadata: { source: 'api' } });
      return res.status(201).json(family);
    } catch (error) {
      return next(error);
    }
  });
  smartApp.get('/v1/families/:id/children', requireRole(['admin', 'coordinator']), (req, res) => {
    return res.json(familyService.listChildren(req.params.id));
  });
  smartApp.post('/v1/invitations', requireRole(['admin']), (req, res, next) => {
    try {
      const invitation = invitationService.issue({ ...req.body, issuerId: req.user.userId || 'admin' });
      return res.status(201).json(invitation);
    } catch (error) {
      return next(error);
    }
  });
  smartApp.get('/v1/notifications', requireRole(['admin', 'coordinator']), (req, res) => {
    return res.json(notificationService.list ? notificationService.list() : []);
  });
  smartApp.post('/v1/notifications', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try { return res.status(201).json(notificationService.create(req.body)); } catch (error) { return next(error); }
  });
  smartApp.post('/v1/notifications/:id/resend', requireRole(['admin', 'coordinator']), (req, res) => {
    return res.json(notificationService.retry(req.params.id));
  });
  smartApp.post('/v1/notifications/:id/cancel', requireRole(['admin', 'coordinator']), (req, res) => {
    return res.json(notificationService.cancel(req.params.id));
  });
  smartApp.post('/v1/sessions', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const session = sessionService.create(req.body);
      auditRepository.record({ entityType: 'reading_session', entityId: session.id, action: 'created', actorId: req.user.role, metadata: { source: 'api' } });
      return res.status(201).json(session);
    } catch (error) {
      return next(error);
    }
  });
  smartApp.get('/v1/sessions', requireRole(['admin', 'coordinator']), (req, res) => {
    const sessions = smartDb.prepare('SELECT id FROM reading_sessions ORDER BY session_date').all().map(row => sessionService.get(row.id));
    return res.json(sessions);
  });
  smartApp.get('/v1/sessions/:id', requireRole(['admin', 'coordinator']), (req, res) => {
    const session = sessionService.get(req.params.id);
    if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    return res.json(session);
  });
  smartApp.patch('/v1/sessions/:id', requireRole(['admin', 'coordinator']), (req, res) => {
    const existing = sessionService.get(req.params.id);
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    if (req.body.status) smartDb.prepare('UPDATE reading_sessions SET status = ?, updated_at = ? WHERE id = ?').run(req.body.status, new Date().toISOString(), req.params.id);
    return res.json(sessionService.get(req.params.id));
  });
  smartApp.post('/v1/sessions/:id/volunteers', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const assignment = assignmentService.create({ ...req.body, sessionId: req.params.id });
      auditRepository.record({ entityType: 'volunteer_assignment', entityId: assignment.id, action: 'created', actorId: req.user.role, metadata: { source: 'api', sessionId: req.params.id } });
      return res.status(201).json(assignment);
    } catch (error) {
      return next(error);
    }
  });
  smartApp.patch('/v1/sessions/:sessionId/volunteers/:id', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const assignment = assignmentService.cancel(req.params.id, req.body.cancellationReason);
      if (!assignment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Assignment not found.' } });
      auditRepository.record({ entityType: 'volunteer_assignment', entityId: assignment.id, action: 'cancelled', actorId: req.user.role, metadata: { reason: req.body.cancellationReason || null, sessionId: req.params.sessionId } });
      return res.json(assignment);
    } catch (error) {
      return next(error);
    }
  });
  smartApp.get('/v1/sessions/:id/history', requireRole(['admin', 'coordinator']), (req, res) => {
    return res.json(auditRepository.list('volunteer_assignment').filter(entry => entry.metadata.sessionId === req.params.id));
  });
  smartApp.use('/v1', (req, res, next) => {
    if (req.path === '/not-found') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
    }
    return next();
  });
  smartApp.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } }));

  return {
    app: smartApp,
    db: smartDb,
    close: () => {
      if (database !== ':memory:') smartDb.close();
    },
  };
}

module.exports = { app, db, createApp };