import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import Home from '../Home';

// Mock `useNavigate` from React Router
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock `react-hot-toast`
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render input fields and buttons', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText('ROOM ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('USERNAME')).toBeInTheDocument();
    expect(screen.getByText(/JOIN/i)).toBeInTheDocument();
    expect(screen.getByText(/New Room/i)).toBeInTheDocument();
  });

  test('should generate a room ID when "New Room" is clicked', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/New Room/i));
    expect(toast.success).toHaveBeenCalledWith("Room id created");
  });

  test('should show an error toast when trying to join without room ID or username', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/JOIN/i));
    expect(toast.error).toHaveBeenCalledWith("room id and username are required");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('should navigate to the editor page when room ID and username are provided', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('ROOM ID'), { target: { value: 'test-room-id' } });
    fireEvent.change(screen.getByPlaceholderText('USERNAME'), { target: { value: 'test-user' } });

    fireEvent.click(screen.getByText(/JOIN/i));

    expect(mockNavigate).toHaveBeenCalledWith('/editor/test-room-id', {
      state: { username: 'test-user' },
    });
    expect(toast.success).toHaveBeenCalledWith("room is created");
  });
});
