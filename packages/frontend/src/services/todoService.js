/**
 * Todo Service
 * Handles all API communication with the backend for todo operations
 */

const API_BASE_URL = '/api';

class TodoService {
  /**
   * Get all todos
   * @returns {Promise<Array>} Array of todo objects
   */
  static async getAllTodos() {
    try {
      const response = await fetch(`${API_BASE_URL}/todos`);
      if (!response.ok) {
        throw new Error(`Failed to fetch todos: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  }

  /**
   * Get a single todo by ID
   * @param {number} id - Todo ID
   * @returns {Promise<Object>} Todo object
   */
  static async getTodoById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch todo: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching todo:', error);
      throw error;
    }
  }

  /**
   * Create a new todo
   * @param {string} title - Todo title
   * @param {string|null} dueDate - Optional due date in ISO format
   * @returns {Promise<Object>} Created todo object
   */
  static async createTodo(title, dueDate = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, dueDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create todo');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  /**
   * Update a todo's title and/or due date
   * @param {number} id - Todo ID
   * @param {string} title - New title
   * @param {string|null} dueDate - New due date or null
   * @returns {Promise<Object>} Updated todo object
   */
  static async updateTodo(id, title, dueDate = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, dueDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update todo');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  /**
   * Toggle the completion status of a todo
   * @param {number} id - Todo ID
   * @returns {Promise<Object>} Updated todo object
   */
  static async toggleTodoStatus(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle todo status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling todo status:', error);
      throw error;
    }
  }

  /**
   * Delete a todo
   * @param {number} id - Todo ID
   * @returns {Promise<Object>} Deletion confirmation object
   */
  static async deleteTodo(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete todo');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }
}

export default TodoService;
