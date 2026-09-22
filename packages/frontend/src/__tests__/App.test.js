import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock server to intercept API requests
const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, title: 'Learn React', dueDate: '2025-12-15', completed: 0, createdAt: '2025-11-01T00:00:00Z' },
        { id: 2, title: 'Build TODO app', dueDate: null, completed: 0, createdAt: '2025-11-02T00:00:00Z' }
      ])
    );
  }),

  rest.post('/api/todos', (req, res, ctx) => {
    const { title, dueDate } = req.body;
    
    if (!title || title.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Todo title is required' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        title,
        dueDate: dueDate || null,
        completed: 0,
        createdAt: new Date().toISOString()
      })
    );
  }),

  rest.put('/api/todos/:id', (req, res, ctx) => {
    const { title, dueDate } = req.body;
    
    if (!title || title.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Todo title is required' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        id: parseInt(req.params.id),
        title,
        dueDate: dueDate || null,
        completed: 0,
        createdAt: '2025-11-01T00:00:00Z'
      })
    );
  }),

  rest.patch('/api/todos/:id/toggle', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: parseInt(req.params.id),
        title: 'Test Todo',
        dueDate: null,
        completed: 1,
        createdAt: '2025-11-01T00:00:00Z'
      })
    );
  }),

  rest.delete('/api/todos/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Todo deleted successfully', id: parseInt(req.params.id) })
    );
  })
);

// Setup and teardown for the mock server
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorageMock.clear();
});
afterAll(() => server.close());

describe('App Component', () => {
  test('renders the app header with title', async () => {
    render(<App />);
    expect(screen.getByText('My Todos')).toBeInTheDocument();
    expect(screen.getByText('🎃')).toBeInTheDocument();
  });

  test('loads and displays todos', async () => {
    render(<App />);

    expect(screen.getByText('Loading your todos...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Learn React')).toBeInTheDocument();
      expect(screen.getByText('Build TODO app')).toBeInTheDocument();
    });
  });

  test('creates a new todo', async () => {
    render(<App />);

    // Wait for the initial loading to complete and todos to load
    await waitFor(() => {
      expect(screen.queryByText('Loading your todos...')).not.toBeInTheDocument();
    });

    // Wait for the input to be enabled (no longer disabled during initial load)
    const titleInput = await screen.findByPlaceholderText('Add a new todo...');
    
    // Verify the button shows "Add Todo" (not "Adding...")
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /Add Todo/ });
      expect(addButton).not.toBeDisabled();
    });

    // Now fill in and submit the form
    fireEvent.change(titleInput, { target: { value: 'New Todo' } });

    const addButton = screen.getByRole('button', { name: /Add Todo/ });
    fireEvent.click(addButton);

    // Wait for the new todo to appear in the list
    await waitFor(() => {
      expect(screen.getByText('New Todo')).toBeInTheDocument();
    });
  });

  test('toggles todo completion status', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Learn React')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
  });

  test('handles API error when fetching todos', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load todos/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no todos', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/No todos yet. Add one to get started!/)).toBeInTheDocument();
    });
  });

  test('toggles theme between light and dark', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
    });

    const themeToggle = screen.getByRole('button', { name: /Switch to dark mode/ });
    fireEvent.click(themeToggle);

    expect(localStorage.getItem('todoAppTheme')).toBe('dark');

    const themToggleAfter = screen.getByRole('button', { name: /Switch to light mode/ });
    fireEvent.click(themToggleAfter);
    expect(localStorage.getItem('todoAppTheme')).toBe('light');
  });
});