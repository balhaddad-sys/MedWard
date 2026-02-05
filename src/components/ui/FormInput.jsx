import { forwardRef, useState, useId } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';

/**
 * FormInput Component
 * Base text input with label and error handling
 */
const FormInput = forwardRef(({
  label,
  error,
  hint,
  required = false,
  type = 'text',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  inputClassName = '',
  ...props
}, ref) => {
  const id = useId();
  const inputId = props.id || id;
  
  const sizeClasses = {
    sm: 'form-input-sm',
    md: '',
    lg: 'form-input-lg',
  };

  return (
    <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {leftIcon && <span className="input-icon input-icon-left">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`form-input ${sizeClasses[size]} ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''} ${inputClassName}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {rightIcon && <span className="input-icon input-icon-right">{rightIcon}</span>}
      </div>
      {error && (
        <span id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className="form-hint">
          {hint}
        </span>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

/**
 * PasswordInput - Password field with toggle visibility
 */
export const PasswordInput = forwardRef(({ ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormInput
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

/**
 * SearchInput - Search field with clear button
 */
export const SearchInput = forwardRef(({
  onClear,
  value,
  ...props
}, ref) => {
  const showClear = value && value.length > 0;

  return (
    <FormInput
      ref={ref}
      type="search"
      value={value}
      leftIcon={<Search size={18} />}
      rightIcon={showClear ? (
        <button
          type="button"
          className="search-clear"
          onClick={onClear}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      ) : null}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

/**
 * TextArea - Multi-line text input
 */
export const TextArea = forwardRef(({
  label,
  error,
  hint,
  required = false,
  rows = 4,
  resize = 'vertical',
  className = '',
  ...props
}, ref) => {
  const id = useId();
  const inputId = props.id || id;

  return (
    <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className="form-textarea"
        style={{ resize }}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <span id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className="form-hint">
          {hint}
        </span>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';

/**
 * Select - Dropdown select input
 */
export const Select = forwardRef(({
  label,
  error,
  hint,
  required = false,
  options = [],
  placeholder = 'Select...',
  className = '',
  ...props
}, ref) => {
  const id = useId();
  const inputId = props.id || id;

  return (
    <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className="form-select"
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className="form-hint">
          {hint}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

/**
 * Checkbox - Checkbox with label
 */
export const Checkbox = forwardRef(({
  label,
  error,
  className = '',
  ...props
}, ref) => {
  const id = useId();
  const inputId = props.id || id;

  return (
    <div className={`checkbox-group ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={inputId} className="checkbox-label">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="checkbox-input"
          {...props}
        />
        <span className="checkbox-custom" />
        {label && <span className="checkbox-text">{label}</span>}
      </label>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

/**
 * RadioGroup - Radio button group
 */
export const RadioGroup = forwardRef(({
  label,
  name,
  options = [],
  value,
  onChange,
  error,
  direction = 'vertical',
  className = '',
}, ref) => {
  return (
    <fieldset className={`radio-group ${direction} ${error ? 'has-error' : ''} ${className}`}>
      {label && <legend className="form-label">{label}</legend>}
      <div className="radio-options">
        {options.map((option) => (
          <label key={option.value} className="radio-label">
            <input
              ref={ref}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              disabled={option.disabled}
              className="radio-input"
            />
            <span className="radio-custom" />
            <span className="radio-text">{option.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
});

RadioGroup.displayName = 'RadioGroup';

/**
 * Toggle - Switch toggle
 */
export const Toggle = forwardRef(({
  label,
  labelPosition = 'right',
  className = '',
  ...props
}, ref) => {
  const id = useId();
  const inputId = props.id || id;

  return (
    <label 
      htmlFor={inputId} 
      className={`toggle-wrapper ${labelPosition === 'left' ? 'label-left' : ''} ${className}`}
    >
      {label && labelPosition === 'left' && (
        <span className="toggle-label">{label}</span>
      )}
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="toggle-input"
        role="switch"
        {...props}
      />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      {label && labelPosition === 'right' && (
        <span className="toggle-label">{label}</span>
      )}
    </label>
  );
});

Toggle.displayName = 'Toggle';

/**
 * CodeInput - PIN/OTP input
 */
export const CodeInput = forwardRef(({
  length = 4,
  value = '',
  onChange,
  error,
  success,
  className = '',
}, ref) => {
  const handleChange = (index, char) => {
    if (!/^\d*$/.test(char)) return;
    
    const newValue = value.split('');
    newValue[index] = char;
    const result = newValue.join('').slice(0, length);
    onChange?.(result);

    // Auto-focus next input
    if (char && index < length - 1) {
      const nextInput = document.querySelector(`[data-code-index="${index + 1}"]`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.querySelector(`[data-code-index="${index - 1}"]`);
      prevInput?.focus();
    }
  };

  return (
    <div className={`code-inputs ${error ? 'has-error' : ''} ${success ? 'has-success' : ''} ${className}`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={i === 0 ? ref : undefined}
          type="text"
          inputMode="numeric"
          maxLength={1}
          data-code-index={i}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`code-digit ${error ? 'error' : ''} ${success ? 'success' : ''}`}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
});

CodeInput.displayName = 'CodeInput';

export default FormInput;
