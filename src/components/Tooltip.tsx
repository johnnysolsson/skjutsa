import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        <Info className="w-4 h-4 text-gray-400 hover:text-cyan-400 transition-colors" />
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 text-xs text-gray-200 rounded-lg border border-white/10 shadow-xl z-50 pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};
