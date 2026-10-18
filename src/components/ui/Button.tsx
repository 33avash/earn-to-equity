import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const base =
  'tap inline-flex items-center justify-center gap-2 rounded font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.22,1,.36,1)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none [&_svg]:transition-transform [&:hover_svg.lucide-arrow-right]:translate-x-0.5 [&:hover_svg.lucide-arrow-up-right]:-translate-y-0.5 [&:hover_svg.lucide-arrow-up-right]:translate-x-0.5';
const variants: Record<Variant, string> = {
  primary: 'bg-evergreen text-onbrand shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_1px_2px_rgb(16_42_35/0.2)] hover:bg-forest hover:shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_8px_20px_-10px_rgb(16_42_35/0.6)]',
  secondary: 'border border-evergreen/20 bg-surface/60 text-evergreen hover:border-evergreen/60 hover:bg-surface',
  ghost: 'text-forest hover:bg-mint/60',
  danger: 'bg-danger text-white hover:opacity-90',
  inverse: 'bg-ivory text-evergreen hover:bg-mint dark:bg-evergreen dark:text-onbrand',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

export const btn = (variant: Variant = 'primary', size: Size = 'md', extra = '') => `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', icon, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={btn(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export function ButtonLink({ variant = 'primary', size = 'md', className = '', children, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return (
    <Link className={btn(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
