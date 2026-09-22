# Testing Guidelines

## Overview

This document outlines the testing strategy and best practices for the todo app. We follow a comprehensive testing approach that ensures code quality, maintainability, and reliability across the entire application.

## Testing Principles

### 1. Test-Driven Development
- Write tests as part of the development process
- Tests should describe expected behavior before implementation
- Use tests to validate and document functionality

### 2. Comprehensive Coverage
- **Target Coverage**: 80%+ code coverage across all packages
- **Coverage Areas**:
  - Unit tests for individual components and functions
  - Integration tests for component interactions and API communication
  - End-to-end tests for critical user workflows
- **Coverage Tools**: Use Jest's coverage reports to track progress

### 3. Test Quality Over Quantity
- Focus on testing behavior, not implementation details
- Write clear, descriptive test names that explain what is being tested
- Avoid brittle tests that break with minor refactoring
- Keep tests maintainable and easy to understand

### 4. Test Isolation
- Tests should be independent and not rely on other tests
- Each test should set up its own data and clean up after itself
- No shared state between tests
- Mock external dependencies (API calls, timers, etc.)

### 5. Maintainability
- Use fixtures and mock data for consistency
- Create test utilities and helpers to reduce duplication
- Organize tests logically with clear setup and assertions
- Keep test code clean and well-structured

## Test Types

### Unit Tests

**Purpose**: Test individual components, functions, and units in isolation

**Scope**:
- React components (props, state, user interactions)
- Express.js route handlers and middleware
- Utility functions and business logic
- Redux actions/reducers (if applicable)

**Tools**: Jest

**Characteristics**:
- Fast execution
- No external dependencies
- Mock all dependencies
- Focus on single responsibility

**Example Structure**:
```
src/
  components/
    Button.js
    __tests__/
      Button.test.js
```

### Integration Tests

**Purpose**: Test how multiple components/functions work together

**Scope**:
- Frontend component interactions (parent-child components)
- Backend API integration with database
- Frontend-to-backend communication via API calls

**Tools**: Jest with `@testing-library/react` for frontend, Jest for backend

**Characteristics**:
- Test real interactions between units
- Mock only external systems (e.g., API responses)
- Verify state changes and side effects
- More comprehensive than unit tests

**Example**:
- Testing a form submission that calls an API and updates the UI

### End-to-End Tests

**Scope**: Out of scope for initial development

End-to-end testing can be added in future iterations if needed. Currently, focus on unit and integration tests to ensure comprehensive coverage.

## Test Organization

### Directory Structure
- Tests are stored in `__tests__/` directories colocated with source files
- This keeps related code and tests together for easier navigation

**Example**:
```
src/
  components/
    TodoCard.js
    __tests__/
      TodoCard.test.js
  utils/
    formatDate.js
    __tests__/
      formatDate.test.js
```

### Test File Naming
- Test files should be named `{filename}.test.js`
- Use descriptive names that indicate what is being tested

### Test Structure
Each test file should follow this structure:

```javascript
// 1. Imports
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

// 2. Setup (if needed)
// Define constants, fixtures, or mock data

// 3. Describe block
describe('MyComponent', () => {
  // 4. Individual tests
  test('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Test Fixtures and Mock Data

### Purpose
- Provide consistent test data
- Reduce duplication across tests
- Improve test maintainability

### Organization
- Create a `__mocks__/` or `fixtures/` directory for shared mock data
- Keep mocks close to the code that uses them

**Example**:
```
src/
  __mocks__/
    todoData.js
  __tests__/
    todoService.test.js
```

### Mock Data Example
```javascript
// src/__mocks__/todoData.js
export const mockTodo = {
  id: '1',
  title: 'Test Todo',
  dueDate: '2025-12-25',
  completed: false,
  createdAt: '2025-11-01T00:00:00Z'
};

export const mockTodos = [mockTodo, { ...mockTodo, id: '2', title: 'Another Todo' }];
```

## Test Utilities

### Create Helper Functions
- Build utilities to reduce test boilerplate
- Use setup functions for common operations

**Example**:
```javascript
// src/__tests__/testUtils.js
import { render } from '@testing-library/react';

export function renderWithProviders(component) {
  // Add any providers/wrappers needed for tests
  return render(component);
}
```

## Writing Testable Code

### Best Practices
1. **Separation of Concerns**: Keep components focused on a single responsibility
2. **Pure Functions**: Use pure functions when possible for easier testing
3. **Dependency Injection**: Pass dependencies as props rather than importing directly
4. **Avoid Side Effects**: Keep side effects isolated and testable
5. **Meaningful Props/Parameters**: Clear interfaces make testing easier

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests for a Specific Package
```bash
npm test --workspace=packages/frontend
npm test --workspace=packages/backend
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- todoService.test.js
```

## Continuous Testing

### Manual Testing Workflow
1. Write tests for new features before or alongside implementation
2. Run tests locally before committing changes
3. Ensure all tests pass before creating pull requests
4. Review test coverage to identify gaps

### Test Driven Development (TDD) Workflow
1. Write failing test for desired behavior
2. Write minimal code to make test pass
3. Refactor code while keeping tests green
4. Repeat for next feature

## Coverage Goals

- **Target**: 80%+ code coverage
- **Critical Paths**: 100% coverage for critical user workflows
- **Excluded**: Configuration files, build scripts, test files themselves

## Maintenance

### Keep Tests Healthy
- Update tests when requirements change
- Refactor tests along with code to prevent brittleness
- Remove obsolete tests
- Add tests for bug fixes before fixing the bug

### Test Review Checklist
- [ ] Test has a clear, descriptive name
- [ ] Test is focused on one behavior
- [ ] All dependencies are mocked
- [ ] Test setup is clear and minimal
- [ ] Assertions are specific and meaningful
- [ ] Test is independent and can run in any order

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)
