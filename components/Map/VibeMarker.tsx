import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { Pin, PinType, VibeCategory } from '../../types';
import { Music, Coffee, Briefcase, Users, Zap } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface VibeMarkerProps {
  pin: Pin;
  onClick: (pin: Pin) => void;
}

const getCategoryColor = (category: VibeCategory) => {
  switch (category) {
    case VibeCategory.PARTY: return '#ef4444'; // Red
    case VibeCategory.CHILL: return '#3b82f6'; // Blue
    case VibeCategory.STUDY: return '#a855f7'; // Purple
    case VibeCategory.OUTDOOR: return '#10b981'; // Green
    case VibeCategory.NETWORKING: return '#f59e0b'; // Amber
    case VibeCategory.FOOD: return '#f97316'; // Orange
    default: return '#6366f1';
  }
};

const getPinIcon = (pin: Pin) => {
  const categoryColor = getCategoryColor(pin.category);

  // 1. STORY PIN STYLE (Enhanced)
  if (pin.type === PinType.STORY) {
    return (
      <div className="relative flex items-center justify-center w-[60px] h-[60px]">
        
        {/* Animated Gradient Ring for Active Stories */}
        <div className="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
             style={{
               background: `conic-gradient(from 0deg, transparent 0%, ${categoryColor} 50%, transparent 100%)`,
               padding: '2px',
               mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
               maskComposite: 'exclude',
               WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
               WebkitMaskComposite: 'xor'
             }}
        />
        
        {/* Solid Ring Background (behind the gradient) */}
         <div className="absolute inset-[3px] rounded-full border-[2px] border-slate-800 bg-slate-900" />

        {/* Avatar Image */}
        <div className="absolute inset-[5px] rounded-full overflow-hidden bg-slate-800 z-10">
          <img 
            src={pin.author.avatarUrl} 
            alt="User" 
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(1.1)' }}
          />
        </div>

        {/* Category Badge (Floating & Distinct) */}
        <div 
          style={{ backgroundColor: categoryColor }} 
          className="absolute -bottom-0 -right-0 w-6 h-6 rounded-full flex items-center justify-center z-20 border-2 border-slate-900 shadow-lg transform hover:scale-110 transition-transform"
        >
           <Zap size={12} color="white" fill="white" />
        </div>
      </div>
    );
  }

  // 2. EVENT/BUSINESS PIN STYLE (Rectangular/Icon based)
  const Icon = pin.category === VibeCategory.PARTY ? Music : 
               pin.category === VibeCategory.STUDY ? Briefcase :
               pin.category === VibeCategory.FOOD ? Coffee : Users;

  return (
    <div className="relative group">
      <div 
        style={{ backgroundColor: categoryColor }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.3)] border-[2px] border-white transform transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-1"
      >
        <Icon size={16} className="text-white drop-shadow-sm" />
        <span className="text-[11px] font-extrabold text-white whitespace-nowrap max-w-[90px] overflow-hidden text-ellipsis drop-shadow-sm uppercase tracking-tight">
          {pin.title || pin.category}
        </span>
      </div>
      
      {/* Arrow */}
      <div 
        style={{ borderTopColor: categoryColor }}
        className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] drop-shadow-sm"
      />
    </div>
  );
};

export const VibeMarker: React.FC<VibeMarkerProps> = ({ pin, onClick }) => {
  const iconHtml = renderToStaticMarkup(getPinIcon(pin));

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'custom-vibe-marker bg-transparent', 
    iconSize: pin.type === PinType.STORY ? [60, 60] : [120, 40],
    iconAnchor: pin.type === PinType.STORY ? [30, 30] : [60, 40], 
  });

  return (
    <Marker 
      position={[pin.lat, pin.lng]} 
      icon={customIcon}
      eventHandlers={{
        click: () => onClick(pin)
      }}
    />
  );
};