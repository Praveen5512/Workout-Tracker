import { fireEvent, render, screen } from '@testing-library/react';
import FlowsScreen from './FlowsScreen';

beforeEach(() => localStorage.clear());

test('creates a flow and saves its ordered workouts locally', () => {
  render(<FlowsScreen />);
  fireEvent.change(screen.getByLabelText('Flow name'), { target: { value: 'Upper body' } });
  fireEvent.change(screen.getByLabelText('Workout 1 name'), { target: { value: 'Push-ups' } });
  fireEvent.click(screen.getByRole('button', { name: /Add/ }));
  fireEvent.change(screen.getByLabelText('Workout 2 name'), { target: { value: 'Pull-ups' } });
  fireEvent.click(screen.getByRole('button', { name: /Save flow/ }));
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
