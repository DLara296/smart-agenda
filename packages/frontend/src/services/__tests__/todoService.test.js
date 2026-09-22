import TodoService from '../todoService';

describe('TodoService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTodos', () => {
    it('should fetch all todos', async () => {
      const mockTodos = [
        { id: 1, title: 'Todo 1', completed: 0, dueDate: null },
        { id: 2, title: 'Todo 2', completed: 1, dueDate: '2025-12-25' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodos
      });

      const result = await TodoService.getAllTodos();

      expect(global.fetch).toHaveBeenCalledWith('/api/todos');
      expect(result).toEqual(mockTodos);
    });

    it('should throw error when fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      await expect(TodoService.getAllTodos()).rejects.toThrow();
    });
  });

  describe('getTodoById', () => {
    it('should fetch single todo by ID', async () => {
      const mockTodo = { id: 1, title: 'Todo 1', completed: 0, dueDate: null };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodo
      });

      const result = await TodoService.getTodoById(1);

      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1');
      expect(result).toEqual(mockTodo);
    });

    it('should throw error for non-existent todo', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      await expect(TodoService.getTodoById(999)).rejects.toThrow();
    });
  });

  describe('createTodo', () => {
    it('should create todo with title only', async () => {
      const mockTodo = { id: 1, title: 'New Todo', completed: 0, dueDate: null };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodo
      });

      const result = await TodoService.createTodo('New Todo');

      expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Todo', dueDate: null })
      });
      expect(result).toEqual(mockTodo);
    });

    it('should create todo with title and due date', async () => {
      const mockTodo = { id: 1, title: 'New Todo', completed: 0, dueDate: '2025-12-25' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodo
      });

      const result = await TodoService.createTodo('New Todo', '2025-12-25');

      expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Todo', dueDate: '2025-12-25' })
      });
      expect(result).toEqual(mockTodo);
    });

    it('should throw error with custom message from server', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Title is required' })
      });

      await expect(TodoService.createTodo('')).rejects.toThrow('Title is required');
    });
  });

  describe('updateTodo', () => {
    it('should update todo title and due date', async () => {
      const mockTodo = { id: 1, title: 'Updated Todo', completed: 0, dueDate: '2025-12-31' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodo
      });

      const result = await TodoService.updateTodo(1, 'Updated Todo', '2025-12-31');

      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Todo', dueDate: '2025-12-31' })
      });
      expect(result).toEqual(mockTodo);
    });

    it('should throw error when update fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Todo not found' })
      });

      await expect(TodoService.updateTodo(999, 'Title', null)).rejects.toThrow('Todo not found');
    });
  });

  describe('toggleTodoStatus', () => {
    it('should toggle todo completion status', async () => {
      const mockTodo = { id: 1, title: 'Todo', completed: 1, dueDate: null };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodo
      });

      const result = await TodoService.toggleTodoStatus(1);

      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockTodo);
    });

    it('should throw error when toggle fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Todo not found' })
      });

      await expect(TodoService.toggleTodoStatus(999)).rejects.toThrow('Todo not found');
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo', async () => {
      const mockResponse = { message: 'Deleted', id: 1 };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await TodoService.deleteTodo(1);

      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when delete fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Todo not found' })
      });

      await expect(TodoService.deleteTodo(999)).rejects.toThrow('Todo not found');
    });
  });
});
