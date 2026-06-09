import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Zap, Target, Search, User as UserIcon, Layers, Map as MapIcon, Compass } from 'lucide-react';
import { INITIAL_PINS, DEFAULT_CENTER, DEFAULT_ZOOM, CURRENT_USER } from './constants';
import { Pin, AIRadarResponse, VibeCategory, PinType } from './types';
import { VibeMarker } from './components/Map/VibeMarker';
import { CreatePinModal } from './components/CreatePinModal';
import { PinDetailView } from './components/PinDetailView';
import { FilterBar } from './components/FilterBar';
import { BottomNav } from './components/BottomNav';
import { getSocialRadarAnalysis, getExploreRecommendations } from './services/geminiService';

// --- Helper Components ---

// Map Controller for events
const MapController = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
};

// --- Main App Component ---

const App: React.FC = () => {
  // State
  const [pins, setPins] = useState<Pin[]>(INITIAL_PINS);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState<[number, number] | null>(null);
  
  // Radar / AI
  const [radarResult, setRadarResult] = useState<AIRadarResponse | null>(null);
  const [isRadarLoading, setIsRadarLoading] = useState(false);
  
  // Explore / Personalization
  const [recommendedIds, setRecommendedIds] = useState<string[] | null>(null);
  const [isExploreLoading, setIsExploreLoading] = useState(false);
  
  // View Modes
  const [activeFilter, setActiveFilter] = useState<VibeCategory | 'ALL'>('ALL');
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'explore', 'notifications', 'profile'

  // Effect: Handle Explore Mode (AI Personalization)
  useEffect(() => {
    if (activeTab === 'explore') {
      const fetchRecommendations = async () => {
        setIsExploreLoading(true);
        // Only fetch if we haven't already (or add refresh logic)
        const ids = await getExploreRecommendations(CURRENT_USER, pins);
        setRecommendedIds(ids);
        setIsExploreLoading(false);
      };
      fetchRecommendations();
    }
  }, [activeTab, pins]);

  // Handlers
  const handleMapClick = (lat: number, lng: number) => {
    if (isCreating) {
      setNewPinLocation([lat, lng]);
      setIsCreating(false);
    } else {
      setSelectedPin(null);
    }
  };

  const handlePinClick = (pin: Pin) => {
    if (!isCreating) {
      setSelectedPin(pin);
    }
  };

  const handleCreatePin = (newPin: Pin) => {
    setPins((prev) => [...prev, newPin]);
    setNewPinLocation(null);
    setSelectedPin(newPin);
  };

  const handleRadarClick = async () => {
    setIsRadarLoading(true);
    // In a real app, calculate visible pins based on map bounds
    const result = await getSocialRadarAnalysis(DEFAULT_CENTER[0], DEFAULT_CENTER[1], pins);
    setRadarResult(result);
    setIsRadarLoading(false);
  };

  // Filtering Logic
  const filteredPins = useMemo(() => {
    return pins.filter(pin => {
      // 1. Basic Category Filter
      if (activeFilter !== 'ALL' && pin.category !== activeFilter) return false;
      
      // 2. Explore Tab Filter (AI Recommendations)
      if (activeTab === 'explore' && recommendedIds) {
        return recommendedIds.includes(pin.id);
      }

      return true;
    });
  }, [pins, activeFilter, activeTab, recommendedIds]);

  // Heatmap Simulation Points
  const heatmapClusters = useMemo(() => {
    if (!heatmapMode) return [];
    return pins.map(p => ({ lat: p.lat, lng: p.lng, weight: p.attendees || 10 }));
  }, [pins, heatmapMode]);

  return (
    <div className="relative w-full h-screen bg-slate-950 text-white overflow-hidden font-sans">
      
      {/* --- Filter Bar (Top) --- */}
      <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {/* --- Desktop Sidebar (Left) --- */}
      <div className="hidden md:flex flex-col absolute top-0 left-0 bottom-0 w-20 bg-slate-900 border-r border-slate-800 z-[400] items-center py-6 gap-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
           <Zap className="text-white fill-white" size={20} />
        </div>
        <div className="flex flex-col gap-6 w-full items-center">
           <button onClick={() => setActiveTab('map')} className={`p-3 rounded-xl transition ${activeTab === 'map' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-white'}`}><MapIcon /></button>
           <button onClick={() => setActiveTab('explore')} className={`p-3 rounded-xl transition ${activeTab === 'explore' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-white'}`}><Compass /></button>
        </div>
        <div className="mt-auto">
           <img src={CURRENT_USER.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-700" alt="Me" />
        </div>
      </div>

      {/* --- Top Search & Overlay --- */}
      <div className="absolute top-4 left-4 md:left-24 right-4 z-[399] pointer-events-none">
         <div className="flex justify-between items-center max-w-4xl mx-auto">
             {/* Search: Only show on desktop here, mobile uses filter bar space */}
             <div className="hidden md:flex pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl px-4 py-2.5 shadow-xl items-center gap-3 w-96">
                <Search className="text-slate-400 w-5 h-5" />
                <input type="text" placeholder="Find people, parties, events..." className="bg-transparent border-none outline-none text-white w-full placeholder-slate-500" />
             </div>
             
             {/* Radar Result Card (Desktop & Mobile) */}
             {radarResult && (
                <div className="pointer-events-auto animate-in slide-in-from-top fade-in duration-500 absolute top-14 left-0 right-0 md:static md:w-auto">
                  <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 backdrop-blur-xl border border-indigo-500/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(79,70,229,0.3)] text-white max-w-sm mx-auto md:mx-0 relative">
                     <button onClick={() => setRadarResult(null)} className="absolute top-2 right-2 text-indigo-300 hover:text-white"><Plus className="rotate-45" size={16}/></button>
                     <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Zap size={12} className="fill-indigo-300"/> Vibe Check</p>
                     <p className="font-bold text-lg leading-tight mb-1">{radarResult.vibeSummary}</p>
                     <p className="text-sm text-indigo-200 opacity-80">"{radarResult.recommendation}"</p>
                  </div>
                </div>
             )}
         </div>
      </div>

      {/* --- Loading State for Explore --- */}
      {isExploreLoading && activeTab === 'explore' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[400] animate-in fade-in slide-in-from-top">
           <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold">
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             Finding your crowd...
           </div>
        </div>
      )}

      {/* --- Main Action Floating Buttons (Bottom Right) --- */}
      <div className="absolute bottom-20 md:bottom-8 right-4 md:right-8 z-[400] flex flex-col gap-4 pointer-events-auto items-end">
         
         {/* Social Radar */}
         <button 
           onClick={handleRadarClick}
           className="group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-900/90 border border-slate-700 text-indigo-400 shadow-xl backdrop-blur-md hover:scale-105 transition active:scale-95"
         >
           {isRadarLoading ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Zap size={24} className={radarResult ? 'fill-indigo-400' : ''} />}
           <span className="absolute right-14 md:right-16 bg-black/80 px-2 py-1 rounded text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Social Radar</span>
         </button>

         {/* Heatmap Toggle */}
         <button 
           onClick={() => setHeatmapMode(!heatmapMode)}
           className={`group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full border shadow-xl backdrop-blur-md transition active:scale-95 ${heatmapMode ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900/90 border-slate-700 text-slate-400'}`}
         >
           <Layers size={24} />
           <span className="absolute right-14 md:right-16 bg-black/80 px-2 py-1 rounded text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Heatmap</span>
         </button>

         {/* Create Pin (Primary FAB) */}
         <button 
           onClick={() => { setIsCreating(!isCreating); setSelectedPin(null); setNewPinLocation(null); }}
           className={`
             flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95
             ${isCreating ? 'bg-red-500 rotate-45' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}
           `}
         >
           <Plus size={32} color="white" />
         </button>
      </div>

      {/* --- Creation Tooltip --- */}
      {isCreating && !newPinLocation && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-[400] animate-bounce">
           <div className="bg-slate-900/90 text-white px-6 py-3 rounded-full border border-slate-700 shadow-xl backdrop-blur font-semibold text-sm">
             Tap map to drop pin 📍
           </div>
        </div>
      )}

      {/* --- Map View --- */}
      <MapContainer 
        center={DEFAULT_CENTER} 
        zoom={DEFAULT_ZOOM} 
        zoomControl={false}
        className="w-full h-full z-0 bg-slate-950"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Heatmap Simulation Layer */}
        {heatmapMode && heatmapClusters.map((point, i) => (
           <Circle 
             key={i}
             center={[point.lat, point.lng]}
             pathOptions={{ 
               fillColor: i % 2 === 0 ? 'red' : 'orange', 
               fillOpacity: 0.3, 
               stroke: false 
             }}
             radius={150}
           />
        ))}

        <MapController onMapClick={handleMapClick} />

        {filteredPins.map(pin => (
          <VibeMarker 
            key={pin.id} 
            pin={pin} 
            onClick={handlePinClick} 
          />
        ))}

        {/* Dynamic Zoom Control for Desktop */}
        <div className="hidden md:block">
           <ZoomControl position="bottomright" />
        </div>
      </MapContainer>

      {/* --- Modals & Sheets --- */}
      
      {/* Create Modal */}
      {newPinLocation && (
        <CreatePinModal 
          location={newPinLocation}
          onClose={() => setNewPinLocation(null)}
          onCreate={handleCreatePin}
        />
      )}

      {/* Pin Detail View (Slide Up) */}
      {selectedPin && (
        <PinDetailView 
          pin={selectedPin} 
          onClose={() => setSelectedPin(null)} 
        />
      )}

      {/* Mobile Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;