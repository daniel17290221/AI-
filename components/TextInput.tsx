import React from 'react';

// Base props common to both input and textarea
interface TextInputCommonProps {
  label?: string;
  id: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

// Props for type="textarea"
interface TextareaFieldProps extends TextInputCommonProps, Omit<React.ComponentPropsWithoutRef<'textarea'>, 'id'> {
  type?: 'textarea'; // Default type, can be omitted
}

// Props for other input types (text, password, email, number)
interface InputFieldProps extends TextInputCommonProps, Omit<React.ComponentPropsWithoutRef<'input'>, 'id'> {
  type: 'text' | 'password' | 'email' | 'number';
}

// Union type for TextInputProps
type TextInputProps = TextareaFieldProps | InputFieldProps;

const TextInput: React.FC<TextInputProps> = ({
  label,
  id,
  error,
  className = '',
  type = 'textarea', // Default to textarea
  ...rest
}) => {
  const baseStyles =
    'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm resize-y ' +
    'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 ' +
    'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-blue-400 dark:focus:border-blue-400';
  const errorStyles = error ? 'border-red-500 focus:border-red-500 dark:border-red-600 dark:focus:border-red-600' : '';

  const commonClasses = `${baseStyles} ${errorStyles} ${className}`;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          id={id}
          className={commonClasses}
          {...(rest as TextareaFieldProps)} // Spread rest props after narrowing type
        />
      ) : (
        <input
          type={type}
          id={id}
          className={commonClasses}
          {...(rest as InputFieldProps)} // Spread rest props after narrowing type
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default TextInput;