import React from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string; // Added description for tooltips
}

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  options: DropdownOption[];
  error?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  id,
  options,
  error,
  className = '',
  ...rest
}) => {
  const baseStyles =
    'block w-full pl-3 pr-10 py-2 text-base border rounded-md shadow-sm focus:outline-none sm:text-sm ' +
    'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 ' +
    'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-blue-400 dark:focus:border-blue-400';
  const errorStyles = error ? 'border-red-500 focus:border-red-500 dark:border-red-600 dark:focus:border-red-600' : '';

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`${baseStyles} ${errorStyles} ${className} appearance-none`}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg
            className="h-4 w-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Dropdown;