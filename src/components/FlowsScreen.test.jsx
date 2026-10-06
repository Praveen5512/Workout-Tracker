import { fireEvent, render, screen } from '@testing-library/react';
import FlowsScreen from './FlowsScreen';
import { ACTIVE_SESSION_KEY } from './FlowPlayerScreen';

beforeEach(() => localStorage.clear());

test('navigates to separate screen to create a flow and saves its ordered workouts locally', () => {
  render(<FlowsScreen />);
  // Click button to navigate to the separate creation screen
  const createButtons = screen.getAllByRole('button', { name: /Create flow|Create a flow/i });
  fireEvent.click(createButtons[0]);
  
  // Fill in flow details on the separate screen
  fireEvent.change(screen.getByLabelText(/Flow name/i), { target: { value: 'Upper body' } });
  fireEvent.change(screen.getByLabelText('Workout 1 name'), { target: { value: 'Push-ups' } });
  fireEvent.click(screen.getByRole('button', { name: /Add Workout/i }));
  fireEvent.change(screen.getByLabelText('Workout 2 name'), { target: { value: 'Pull-ups' } });
  
  // Save flow from separate screen
  const saveButtons = screen.getAllByRole('button', { name: /Save flow/i });
  fireEvent.click(saveButtons[0]);
  
  // Verified saved in list and storage
  expect(screen.getByText('Upper body')).toBeInTheDocument();
  const stored = JSON.parse(localStorage.getItem('apextrack_flows_v1'));
  expect(stored[0].exercises.map(item => item.name)).toEqual(['Push-ups', 'Pull-ups']);
});

test('plays a flow, advances workouts, and records one completed session', () => {
  localStorage.setItem('apextrack_flows_v1', JSON.stringify([{ id: 'flow-1', name: 'Quick set', exercises: [{ id: 'a', name: 'Squats', sets: 2, reps: 12, workoutTimeMin: 1 }, { id: 'b', name: 'Lunges', sets: 2, reps: 10, workoutTimeMin: 1 }] }]));
  render(<FlowsScreen />);
  fireEvent.click(screen.getByRole('button', { name: /Play flow/ }));
  expect(screen.getByRole('heading', { name: 'Squats' })).toBeInTheDocument();
  expect(screen.getByText('Lunges')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Completed/ }));
  expect(screen.getByRole('heading', { name: 'Lunges' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Completed/ }));
  expect(screen.getByText('Flow completed')).toBeInTheDocument();
  const history = JSON.parse(localStorage.getItem('apextrack_flow_session_history_v1'));
  expect(history).toHaveLength(1);
  expect(history[0].flowId).toBe('flow-1');
});

test('removes history older than 30 days without deleting saved flows', () => {
  localStorage.setItem('apextrack_flows_v1', JSON.stringify([{ id: 'keep', name: 'Keep this flow', exercises: [{ id: 'a', name: 'Plank', sets: 1, reps: 1, workoutTimeMin: 1 }] }]));
  localStorage.setItem('apextrack_flow_session_history_v1', JSON.stringify([{ id: 'old', flowId: 'keep', flowName: 'Keep this flow', completedAt: new Date(Date.now() - 31 * 86400000).toISOString(), durationSeconds: 300 }]));
  render(<FlowsScreen />);
  expect(screen.getByText('Keep this flow')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('apextrack_flow_session_history_v1'))).toEqual([]);
  expect(JSON.parse(localStorage.getItem('apextrack_flows_v1'))).toHaveLength(1);
});

test('is refresh-proof when playing a flow by restoring active session on reload', () => {
  const activeSession = {
    flowId: 'flow-123',
    flowName: 'Morning Circuit',
    exercises: [
      { id: 'ex-1', name: 'Jumping Jacks', sets: 3, reps: 20, workoutTimeMin: 2 },
      { id: 'ex-2', name: 'Burpees', sets: 3, reps: 10, workoutTimeMin: 2 }
    ],
    currentIndex: 1,
    sessionStatus: 'running',
    startedAt: Date.now() - 45000,
    accumulatedMs: 15000,
    completedIndices: [0],
    restoredFromRefresh: true
  };
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeSession));
  localStorage.setItem('apextrack_flows_current_view_v1', 'player');

  render(<FlowsScreen />);

  // Should automatically restore right to the active exercise Burpees
  expect(screen.getByRole('heading', { name: 'Burpees' })).toBeInTheDocument();
  expect(screen.getByText(/Workout session resumed • Refresh proof/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Pause timer/i })).toBeInTheDocument();
});

test('is refresh-proof when creating a flow by restoring unsaved draft on reload', () => {
  const draft = {
    editingId: null,
    flowName: 'Restored Draft Routine',
    exercises: [
      { id: 'e1', name: 'Diamond Pushups', sets: 4, reps: 12, workoutTimeMin: 2 }
    ],
    updatedAt: Date.now()
  };
  localStorage.setItem('apextrack_flow_editor_draft_v1', JSON.stringify(draft));
  localStorage.setItem('apextrack_flows_current_view_v1', 'create');

  render(<FlowsScreen />);

  // Should restore directly to the separate editor screen with draft values
  expect(screen.getByDisplayValue('Restored Draft Routine')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Diamond Pushups')).toBeInTheDocument();
  expect(screen.getByText(/Restored your unsaved draft/i)).toBeInTheDocument();
});
