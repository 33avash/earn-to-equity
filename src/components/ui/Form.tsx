import { useEffect, useId, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface FieldProps {
  label: string;
  hint?: string;
  help?: string; // tooltip text
  error?: string | null;
  optional?: boolean;
  /** Receives the input id, the ids describing it, and whether the field currently has an error. */
  children: (id: string, describedBy: string | undefined, invalid: boolean) => ReactNode;
  className?: string;
}

export function Field({ label, hint, help, error, optional, children, className = '' }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-charcoal">
          {label}
          {optional && <span className="ml-1 font-normal text-grey">(optional)</span>}
        </label>
        {help && (
          <Tooltip content={help}>
            <Info size={13} className="text-grey" aria-hidden />
          </Tooltip>
        )}
      </div>
      {children(id, describedBy, Boolean(error))}
      {hint && !error && (
        <p id={hintId} className="text-xs text-grey">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  id?: string;
  describedBy?: string;
  ariaLabel?: string;
  /** Called with a message when the typed value is rejected (or null when valid). */
  onValidity?: (msg: string | null) => void;
  className?: string;
  size?: 'sm' | 'md';
  /** Marks the input invalid when the surrounding field reports an error. */
  invalid?: boolean;
  /** Whole numbers only: shows the numeric keypad on phones. */
  integer?: boolean;
  /**
   * Renders a native number input with real min/max attributes (ages, years, months). Every whole number
   * is committed, so the owning form can show its own inline error instead of silently rejecting input.
   */
  native?: boolean;
}

const groupIN = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * Numeric input that lets people type freely, groups digits Indian-style when not focused,
 * and only commits valid values. Out-of-range values show an error instead of being silently clamped.
 */
export function NumberInput(props: NumberInputProps) {
  return props.native ? <NativeNumberInput {...props} /> : <GroupedNumberInput {...props} />;
}

function NativeNumberInput({ value, onChange, min, max, id, describedBy, ariaLabel, className = '', size = 'md', invalid }: NumberInputProps) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '');
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : Number.isFinite(value) ? String(value) : ''));
  }, [value]);
  const h = size === 'sm' ? 'h-8 text-[13px]' : 'h-10 text-sm';
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
      className={`input num ${h} ${invalid ? 'input-error' : ''} ${className}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value.trim() === '') return onChange(Number.NaN);
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

function GroupedNumberInput({ value, onChange, min, max, step, prefix, suffix, id, describedBy, ariaLabel, onValidity, className = '', size = 'md', invalid, integer }: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(String(value ?? ''));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!focused) setText(Number.isFinite(value) ? String(+value.toFixed(4)) : '');
  }, [value, focused]);

  const commit = (raw: string) => {
    setText(raw);
    const cleaned = raw.replace(/[,\s₹%]/g, '');
    if (cleaned === '' || cleaned === '-') {
      const msg = 'Enter a number';
      setError(msg);
      onValidity?.(msg);
      return;
    }
    const n = Number(cleaned);
    let msg: string | null = null;
    if (!Number.isFinite(n)) msg = 'Enter a valid number';
    else if (min !== undefined && n < min) msg = `Minimum is ${groupIN.format(min)}`;
    else if (max !== undefined && n > max) msg = `Maximum is ${groupIN.format(max)}`;
    setError(msg);
    onValidity?.(msg);
    if (!msg) onChange(n);
  };

  const display = focused ? text : Number.isFinite(value) ? groupIN.format(value) : '';
  const h = size === 'sm' ? 'h-8 text-[13px]' : 'h-10 text-sm';
  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && <span className="pointer-events-none absolute left-3 text-sm text-grey">{prefix}</span>}
      <input
        id={id}
        inputMode={integer ? 'numeric' : 'decimal'}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error || invalid ? true : undefined}
        className={`input ${h} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''} ${error || invalid ? 'input-error' : ''}`}
        value={display}
        step={step}
        onFocus={() => {
          setFocused(true);
          setText(Number.isFinite(value) ? String(+value.toFixed(4)) : '');
        }}
        onBlur={() => {
          setFocused(false);
          if (error) {
            setError(null);
            onValidity?.(null);
          }
        }}
        onChange={(e) => commit(e.target.value)}
      />
      {suffix && <span className="pointer-events-none absolute right-3 text-sm text-grey">{suffix}</span>}
      {error && focused && (
        <span role="alert" className="absolute -bottom-5 left-0 text-[11px] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

/** Rupee input. */
export function MoneyInput(props: Omit<NumberInputProps, 'prefix'>) {
  return <NumberInput min={0} integer {...props} prefix="₹" />;
}

/** Percentage input: shows 7.5, stores 0.075. */
export function PercentInput({ value, onChange, min = 0, max = 100, ...rest }: Omit<NumberInputProps, 'suffix'>) {
  return <NumberInput {...rest} min={min} max={max} value={+(value * 100).toFixed(3)} onChange={(v) => onChange(v / 100)} suffix="%" />;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  help?: string;
}

/** Labelled range slider with the current value shown; paired with an accessible native input. */
export function Slider({ label, value, min, max, step, onChange, format, help }: SliderProps) {
  const id = useId();
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-medium text-charcoal">
          {label}
          {help && (
            <Tooltip content={help}>
              <Info size={13} className="text-grey" aria-hidden />
            </Tooltip>
          )}
        </label>
        <span className="num text-sm font-semibold text-evergreen">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        style={{ ['--fill' as string]: fill }}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="flex justify-between text-[11px] text-grey num">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`input pr-8 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-charcoal">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-grey">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`hit relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-forest' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

/** Segmented control for small mutually exclusive choices. */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`tap ${size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]'} rounded-[3px] font-medium transition-colors ${
            value === o.value ? 'bg-evergreen text-onbrand' : 'text-grey hover:text-evergreen'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
