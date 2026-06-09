import React from 'react';
import { Pin, PinType } from '../types';
import { Badge } from './ui/Badge';
import { X, Clock, MapPin, Share2, Users, Heart } from 'lucide-react';

interface PinDetailViewProps {
  pin: Pin;
  onClose: () => void;
}

export const PinDetailView: React.FC<PinDetailViewProps> = ({ pin, onClose }) => {
  return (
    <div 
      className={`
        absolute z-[500] bg-slate-900/95 backdrop-blur-xl border-t md:border-r border-slate-700 
        shadow-2xl flex flex-col
        w-full md:w-[450px] 
        h-[60vh] md:h-full 
        bottom-0 md:left-0 md:top-0
        rounded-t-3xl md:rounded-none animate-in slide-in-from-bottom duration-300 md:slide-in-from-left
      `}
    >
      {/* Cover Image (if exists) */}
      <div className="relative h-48 md:h-64 flex-shrink-0 bg-slate-800">
         {pin.mediaUrl ? (
           <img src={pin.mediaUrl} className="w-full h-full object-cover opacity-90" alt="Cover" />
         ) : (
           <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
         
         <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-black/70 transition z-10"
          >
            <X size={20} />
          </button>

         {/* Author Badge floating */}
         <div className="absolute -bottom-6 left-6 flex items-end">
            <img 
              src={pin.author.avatarUrl} 
              className="w-16 h-16 rounded-full border-4 border-slate-900 shadow-lg" 
              alt="Author" 
            />
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-8 px-6 pb-24 custom-scrollbar">
        <div className="flex items-center justify-between mb-2">
           <Badge category={pin.category} />
           {pin.isLive && (
             <span className="flex items-center gap-1.5 text-red-500 text-xs font-bold uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded-full">
               <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/> Live Now
             </span>
           )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          {pin.title || `${pin.author.name}'s Story`}
        </h1>
        
        <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
           <span className="font-semibold text-slate-300">@{pin.author.handle}</span>
           <span>•</span>
           <Clock size={14} />
           <span>2h ago</span>
           {pin.type === PinType.EVENT && (
             <>
               <span>•</span>
               <span className="text-indigo-400 font-semibold">
                  {pin.price ? `$${pin.price}` : 'Free'}
               </span>
             </>
           )}
        </p>

        <p className="text-slate-200 text-base leading-relaxed mb-8 whitespace-pre-wrap">
          {pin.description}
        </p>

        {/* Stats / Action Row */}
        <div className="flex items-center gap-4 mb-8">
           <div className="flex -space-x-3">
              {[1,2,3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs overflow-hidden">
                  <img src={`https://picsum.photos/100/100?random=${i+10}`} />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                +{pin.attendees}
              </div>
           </div>
           <span className="text-sm text-slate-400">
             {pin.type === PinType.EVENT ? 'Attending' : 'Viewed'}
           </span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-600/20 active:scale-95">
             <Heart size={18} className={pin.type === PinType.EVENT ? 'fill-transparent' : 'fill-white'} />
             {pin.type === PinType.EVENT ? 'RSVP' : 'Like'}
          </button>
          <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition border border-slate-700 active:scale-95">
             <Share2 size={18} />
             Share
          </button>
        </div>
        
        {pin.type === PinType.EVENT && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
             <div className="flex items-start gap-3">
                <MapPin className="text-slate-400 mt-1" size={20} />
                <div>
                   <p className="text-sm font-semibold text-white">Location</p>
                   <p className="text-xs text-slate-400">1.2 km away • Union Square</p>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
