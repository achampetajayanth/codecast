import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import EditorPage from '../EditorPage';  // Updated path
import toast from 'react-hot-toast';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { username: 'test-user' } }),
  useParams: () => ({ roomId: 'test-room-id' }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock socket initialization
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

// Mock the Editor component since we're only testing EditorPage
jest.mock('../Editor', () => {
  return function MockEditor() {
    return <div data-testid="mock-editor">Mock Editor</div>;
  };
});

// Mock the Client component
jest.mock('../Client', () => {
  return function MockClient({ username }) {
    return <div data-testid="mock-client">{username}</div>;
  };
});

// Update the mock path to match your project structure
jest.mock('../../socket', () => ({
  initSocket: () => Promise.resolve(mockSocket),
}));

describe('EditorPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders editor page with initial components', () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Members/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Room ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Leave Room/i)).toBeInTheDocument();
    expect(screen.getByAltText('Logo')).toBeInTheDocument();
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();
  });

  test('initializes socket connection and joins room', async () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('JOIN', {
        roomId: 'test-room-id',
        username: 'test-user',
      });
    });
  });

  test('handles socket connection error', async () => {
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'connect_error') {
        callback(new Error('Connection failed'));
      }
    });

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Socket connection failed, Try again later'
      );
    });
  });

  test('updates clients list when new user joins', async () => {
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'JOINED') {
        callback({
          clients: [
            { socketId: '1', username: 'test-user' },
            { socketId: '2', username: 'another-user' },
          ],
          username: 'another-user',
          socketId: '2',
        });
      }
    });

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('another-user')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('another-user joined the room.');
    });
  });

  test('copies room ID to clipboard', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const copyButton = screen.getByText(/Copy Room ID/i);
    await fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-room-id');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Room ID is copied');
    });
  });

  test('handles clipboard copy error', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const copyButton = screen.getByText(/Copy Room ID/i);
    await fireEvent.click(copyButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Unable to copy the room ID');
    });
  });

  test('navigates to home when leaving room', () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const leaveButton = screen.getByText(/Leave Room/i);
    fireEvent.click(leaveButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('redirects to home when no username in location state', () => {
    jest.spyOn(require('react-router-dom'), 'useLocation')
      .mockReturnValue({ state: null });

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Members/i)).not.toBeInTheDocument();
  });

  test('handles user disconnection', async () => {
    // Set up initial state
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'JOINED') {
        callback({
          clients: [
            { socketId: '1', username: 'test-user' },
            { socketId: '2', username: 'another-user' },
          ],
          username: 'test-user',
          socketId: '1',
        });
      }
    });

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('another-user')).toBeInTheDocument();
    });

    // Simulate disconnection
    const disconnectedCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'DISCONNECTED'
    )[1];

    disconnectedCallback({
      socketId: '2',
      username: 'another-user',
    });

    await waitFor(() => {
      expect(screen.queryByText('another-user')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('another-user left the room');
    });
  });

  test('cleans up socket listeners on unmount', () => {
    const { unmount } = render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('JOINED');
    expect(mockSocket.off).toHaveBeenCalledWith('DISCONNECTED');
  });
});