import React, { useState, useEffect } from 'react';
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';
import ThemeToggle from './components/ThemeToggle';
import ConfirmDialog from './components/ConfirmDialog';
import TodoService from './services/todoService';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('todoAppTheme');
    if (savedTheme) {
      return savedTheme;
    }
    // Default to light theme
    return 'light';
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTodoId, setDeletingTodoId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('todoAppTheme', theme);
  }, [theme]);

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TodoService.getAllTodos();
      setTodos(data);
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError('Failed to load todos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async (title, dueDate) => {
    try {
      const newTodo = await TodoService.createTodo(title, dueDate);
      setTodos([newTodo, ...todos]);
      setError(null);
    } catch (err) {
      console.error('Error creating todo:', err);
      setError(err.message || 'Failed to create todo');
      throw err;
    }
  };

  const handleToggleTodo = async (todoId) => {
    try {
      const updatedTodo = await TodoService.toggleTodoStatus(todoId);
      setTodos(todos.map(todo => (todo.id === todoId ? updatedTodo : todo)));
      setError(null);
    } catch (err) {
      console.error('Error toggling todo:', err);
      setError('Failed to update todo');
    }
  };

  const handleEditTodo = async (todoId, title, dueDate) => {
    try {
      const updatedTodo = await TodoService.updateTodo(todoId, title, dueDate);
      setTodos(todos.map(todo => (todo.id === todoId ? updatedTodo : todo)));
      setError(null);
    } catch (err) {
      console.error('Error updating todo:', err);
      setError(err.message || 'Failed to update todo');
      throw err;
    }
  };

  const handleDeleteTodo = (todoId) => {
    setDeletingTodoId(todoId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await TodoService.deleteTodo(deletingTodoId);
      setTodos(todos.filter(todo => todo.id !== deletingTodoId));
      setShowDeleteConfirm(false);
      setDeletingTodoId(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting todo:', err);
      setError('Failed to delete todo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingTodoId(null);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="app-icon">🎃</span>
            My Todos
          </h1>
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
      </header>

      <main className="app-main">
        <div className="app-container">
          <TodoForm
            onSubmit={handleCreateTodo}
            isLoading={loading}
          />

          {error && (
            <div className="app-error">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="btn-close">✕</button>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <p>Loading your todos...</p>
            </div>
          )}

          {!loading && (
            <TodoList
              todos={todos}
              onToggle={handleToggleTodo}
              onEdit={handleEditTodo}
              onDelete={handleDeleteTodo}
              isLoading={isDeleting}
            />
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Todo?"
        message="Are you sure you want to delete this todo? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        isDangerous={true}
      />
    </div>
  );
}

export default App;