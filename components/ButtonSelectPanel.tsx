import React from 'react';
import { DropdownOption } from './Dropdown'; // Reusing DropdownOption type

interface ButtonSelectPanelProps {
  label: string; // Used as the header label for the section
  options: DropdownOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
}

const ButtonSelectPanel: React.FC<ButtonSelectPanelProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  disabled,
}) => {
  const handleButtonClick = (value: string) => {
    let newSelection: string[];
    if (value === '선택 안함') {
      // If '선택 안함' is clicked, toggle it as the *only* option
      newSelection = selectedValues.includes('선택 안함') ? [] : ['선택 안함'];
    } else {
      // If another option is clicked
      const currentSelection = selectedValues.filter(v => v !== '선택 안함'); // Remove '선택 안함' if present
      if (currentSelection.includes(value)) {
        newSelection = currentSelection.filter((v) => v !== value);
      } else {
        newSelection = [...currentSelection, value];
      }
      // If no other options are selected, add '선택 안함' back
      if (newSelection.length === 0) {
        newSelection = ['선택 안함'];
      }
    }
    onChange(newSelection);
  };

  return (
    <div className="mb-6">
      <h4 className="block text-lg font-medium text-gray-800 dark:text-gray-100 mb-3">
        {label}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          // Simplified className construction for robustness
          // Changed px-3 py-1.5 text-sm to px-2 py-1 text-xs for smaller buttons
          const baseClasses = "flex items-center justify-center px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 ease-in-out";
          const stateClasses = isSelected
            ? 'bg-blue-600 text-white ring-2 ring-blue-500 dark:bg-blue-700 dark:ring-blue-600'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600';
          const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

          return (
            <button
              key={option.value}
              type="button"
              className={`${baseClasses} ${stateClasses} ${disabledClasses}`} // Simple template literal
              onClick={() => handleButtonClick(option.value)}
              disabled={disabled}
              aria-pressed={isSelected}
              title={option.description}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ButtonSelectPanel;