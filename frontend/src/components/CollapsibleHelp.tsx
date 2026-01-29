import { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

interface CollapsibleHelpProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleHelp({ title, children, defaultOpen = false }: CollapsibleHelpProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/50 transition-colors"
      >
        <HelpCircle size={18} className="text-slate-400" />
        <span className="font-medium text-slate-300 flex-1">{title}</span>
        {isOpen ? (
          <ChevronDown size={18} className="text-slate-400" />
        ) : (
          <ChevronRight size={18} className="text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
