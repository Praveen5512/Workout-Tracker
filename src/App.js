import { useState } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import HomeScreen from './components/HomeScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import ListDataScreen from './components/ListDataScreen';
import WorkoutModal from './components/WorkoutModal';
import WorkoutDetailModal from './components/WorkoutDetailModal';
import SettingsModal from './components/SettingsModal';
import { useWorkoutTracker } from './hooks/useWorkoutTracker';
import './App.css';

function App() {
  const {
    workouts,
    syncState,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    triggerSync,
    resetSampleData
  } = useWorkoutTracker();

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'analytics' | 'list'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [selectedWorkoutDetail, setSelectedWorkoutDetail] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Handle saving (Create or Update)
  const handleSaveWorkout = (workoutData, existingId) => {
    if (existingId) {
      updateWorkout(existingId, workoutData);
    } else {
      addWorkout(workoutData);
    }
  };

  // Open Edit modal from list or detail
  const handleStartEdit = (workout) => {
    setEditingWorkout(workout);
    setIsCreateModalOpen(true);
  };

  // Delete confirmation
  const handleDeleteWorkout = (id) => {
    if (window.confirm('Are you sure you want to delete this workout log?')) {
      deleteWorkout(id);
    }
  };

  return (
    <div className="app-container">
      {/* 8.1 Header with identity, online/offline and sync states */}
      <Header
        syncState={syncState}
        onTriggerSync={triggerSync}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Content Area switching between Home, Analytics, List */}
      <main className="main-content">
        {activeTab === 'home' && (
          <HomeScreen
            workouts={workouts}
            onOpenCreateModal={() => {
              setEditingWorkout(null);
              setIsCreateModalOpen(true);
            }}
            onSelectWorkout={(w) => setSelectedWorkoutDetail(w)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsScreen workouts={workouts} />
        )}

        {activeTab === 'list' && (
          <ListDataScreen
            workouts={workouts}
            onSelectWorkout={(w) => setSelectedWorkoutDetail(w)}
            onEditWorkout={handleStartEdit}
            onDeleteWorkout={handleDeleteWorkout}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Create / Edit Workout Modal */}
      <WorkoutModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingWorkout(null);
        }}
        onSave={handleSaveWorkout}
        initialData={editingWorkout}
      />

      {/* Workout Detail Modal */}
      <WorkoutDetailModal
        isOpen={Boolean(selectedWorkoutDetail)}
        workout={selectedWorkoutDetail}
        onClose={() => setSelectedWorkoutDetail(null)}
        onEdit={(w) => {
          setSelectedWorkoutDetail(null);
          handleStartEdit(w);
        }}
        onDelete={(id) => {
          setSelectedWorkoutDetail(null);
          handleDeleteWorkout(id);
        }}
      />

      {/* Settings & Google Apps Script Config Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        syncState={syncState}
        onTriggerSync={triggerSync}
        onResetData={resetSampleData}
      />
    </div>
  );
}

export default App;
