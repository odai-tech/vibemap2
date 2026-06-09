import React, { useState } from 'react';
import { PinType, VibeCategory, Pin } from '../types';
import { CURRENT_USER } from '../constants';
import { X, Camera, MapPin, Calendar, Clock, DollarSign, Image as ImageIcon } from 'lucide-react';
import { Badge } from './ui/Badge';

interface CreatePinModalProps {
  location: [number, number];
  onClose: () => void;
  onCreate: (pin: Pin) => void;
}

export const CreatePinModal: React.FC<CreatePinModalProps> = ({ location, onClose, onCreate }) => {
  const [activeTab, setActiveTab] = useState<PinType>(PinType.STORY);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VibeCategory>(VibeCategory.CHILL);
  const [price, setPrice] = useState<string>('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPin: Pin = {
      id: Math.random().toString(36).substr(2, 9),
      lat: location[0],
      lng: location[1],
      type: activeTab,
      category,
      title: activeTab === PinType.STORY ? undefined : title,
      description,
      author: CURRENT_USER,
      createdAt: Date.now(),
      isLive: true,
      attendees: 1,
      price: price ? parseInt(price) : 0,
      mediaUrl: activeTab === PinType.STORY ? 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&h=800' : undefined // Mock image
    };
    onCreate(newPin);
  };

  const tabs = [
    { id: PinType.STORY, label: 'Story', icon: Camera },
    { id: PinType.EVENT, label: 'Event', icon: Calendar },
    { id: PinType.MOMENT, label: 'Moment', icon: Clock },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-slate-900 border-t md:border border-slate-700 w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-4 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            New Post
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-2 gap-2 bg-slate-900">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          
          {/* Mock Media Uploader for Stories */}
          {activeTab === PinType.STORY && (
            <div className="w-full h-32 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition cursor-pointer group">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center mb-2 group-hover:bg-indigo-500/20 transition">
                 <ImageIcon size={20} />
              </div>
              <span className="text-xs font-semibold">Upload Photo or Video</span>
            </div>
          )}

          {/* Title (Only for Events/Moments) */}
          {activeTab !== PinType.STORY && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={activeTab === PinType.EVENT ? "Summer Rooftop Party" : "Working at Blue Bottle"}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Category Scroller */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Vibe</label>
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {Object.values(VibeCategory).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex-shrink-0 text-xs px-4 py-2 rounded-full border transition-all font-medium ${
                    category === c
                      ? 'bg-white text-black border-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              {activeTab === PinType.STORY ? 'Caption' : 'Description'}
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={activeTab === PinType.STORY ? 2 : 3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Event Specifics */}
          {activeTab === PinType.EVENT && (
             <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Price ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 text-slate-500" size={14} />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Free"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex-1">
                   <label className="block text-xs font-semibold text-slate-400 mb-1">Time</label>
                   <input
                      type="datetime-local"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                </div>
             </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <MapPin size={18} />
            Drop Pin
          </button>
        </form>
      </div>
    </div>
  );
};
