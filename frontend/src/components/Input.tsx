import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="form-group">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className={`${className} ${error ? 'input-error' : ''}`} {...props} />
      {error && <span className="error-text" style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{error}</span>}
    </div>
  );
};
export default Input;
