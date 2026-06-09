import React from 'react';
import { Map, Compass, User, Bell } from 'lucide-react';

interface BottomNavProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onTabChange, activeTab }) => {
  const tabs = [
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'notifications', icon: Bell, label: 'Alerts' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center z-[400] md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-1 transition-colors ${
             activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
