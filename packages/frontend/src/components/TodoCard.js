import React, { useState } from 'react';

function TodoCard({ todo, onToggle, onEdit, onDelete, isLoading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate || '');
  const [editError, setEditError] = useState(null);

  const handleToggle = async () => {
    try {
      await onToggle(todo.id);
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditError(null);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTitle(todo.title);
    setEditDueDate(todo.dueDate || '');
    setEditError(null);
  };

  const handleEditSubmit = async () => {
    if (!editTitle.trim()) {
      setEditError('Title cannot be empty');
      return;
    }

    if (editTitle.length > 255) {
      setEditError('Title cannot exceed 255 characters');
      return;
    }

    try {
      await onEdit(todo.id, editTitle.trim(), editDueDate || null);
      setIsEditing(false);
      setEditError(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update todo');
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to delete this todo? This action cannot be undone.')) {
      onDelete(todo.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isEditing) {
    return (
      <div className="todo-card todo-card-edit">
        <div className="edit-form">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={255}
            className="form-input"
            placeholder="Todo title"
            disabled={isLoading}
            aria-label="Edit todo title"
          />
          <input
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            className="form-input"
            disabled={isLoading}
            aria-label="Edit due date"
          />
          <div className="edit-actions">
            <button
              onClick={handleEditSubmit}
              disabled={isLoading}
              className="btn btn-primary btn-sm"
            >
              Save
            </button>
            <button
              onClick={handleEditCancel}
              disabled={isLoading}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
          </div>
          {editError && <div className="form-error">{editError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`todo-card ${todo.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed === 1}
        onChange={handleToggle}
        disabled={isLoading}
        className="todo-checkbox"
        aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />

      <div className="todo-content">
        <h3 className="todo-title">{todo.title}</h3>
        {todo.dueDate && (
          <p className="todo-due-date">
            Due: {formatDate(todo.dueDate)}
          </p>
        )}
      </div>

      <div className="todo-actions">
        <button
          onClick={handleEditClick}
          disabled={isLoading}
          className="btn-icon btn-edit"
          title="Edit todo"
          aria-label={`Edit "${todo.title}"`}
        >
          ✎
        </button>
        <button
          onClick={handleDeleteClick}
          disabled={isLoading}
          className="btn-icon btn-delete"
          title="Delete todo"
          aria-label={`Delete "${todo.title}"`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default TodoCard;
