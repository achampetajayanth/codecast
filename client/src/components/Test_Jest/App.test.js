// src/App.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import Home from '../Home';
import EditorPage from '../EditorPage';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  Toaster: () => <div>Mocked Toaster</div>
}));

// Mock the EditorPage component
jest.mock('./components/EditorPage', () => {
  return () => <div>Mocked Editor Page</div>;
});

// Mock the Home component
jest.mock('./components/Home', () => {
  return () => <div>Home Component Content</div>;
});

describe('App Component', () => {
  test('renders Home component at root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Home Component Content')).toBeInTheDocument();
  });

  test('renders EditorPage component at /editor/:roomId path', () => {
    const roomId = '12345';
    render(
      <MemoryRouter initialEntries={[`/editor/${roomId}`]}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Mocked Editor Page')).toBeInTheDocument();
  });
});