import React, { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  isOpen?: boolean; // New prop for controlled state
  onToggle?: () => void; // New prop for controlled state
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  initialOpen = false,
  isOpen: controlledIsOpen, // Renamed to avoid conflict with internal state
  onToggle: controlledOnToggle, // Renamed to avoid conflict with internal state
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(initialOpen);

  // Determine whether to use controlled props or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const toggleOpen = controlledOnToggle
    ? controlledOnToggle
    : () => setInternalIsOpen(!internalIsOpen);

  return (
    <div className="border border-purple-300 dark:border-purple-700 rounded-lg mb-4 bg-purple-100 dark:bg-purple-800">
      <button
        className="flex justify-between items-center w-full px-4 py-3 text-lg font-medium text-gray-800 dark:text-gray-100 hover:bg-purple-200 dark:hover:bg-purple-700 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-')}`}
      >
        {title}
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      <div
        id={`collapsible-content-${title.replace(/\s+/g, '-')}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[9999px] opacity-100 p-4' : 'max-h-0 opacity-0 px-4'}`}
      >
        {children}
      </div>
    </div>
  );
};

export default CollapsibleSection;