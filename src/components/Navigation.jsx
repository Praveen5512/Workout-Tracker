import { Home, TrendingUp, ListFilter } from 'lucide-react';

export default function Navigation({ activeTab, onTabChange }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'list', label: 'Workouts', icon: ListFilter }
  ];

  return (
    <nav className="bottom-nav glass-panel" aria-label="Main Navigation">
      <div className="bottom-nav-inner">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              aria-selected={isActive}
            >
              <div className="nav-icon-container">
                <Icon size={20} />
                {isActive && <div className="nav-active-pill" />}
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
