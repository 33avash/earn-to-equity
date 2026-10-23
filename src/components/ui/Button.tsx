import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

// Fully rounded island buttons. They press in slightly on click; see .btn in index.css for the arrow well.
const base =
  'btn tap group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,box-shadow,color,transform] duration-500 ease-spring active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none';
const variants: Record<Variant, string> = {
  primary: 'bg-evergreen text-onbrand shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_10px_30px_-12px_rgb(10_10_11/0.45)] hover:bg-forest dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_10px_40px_-12px_rgb(45_212_191/0.35)]',
  secondary: 'bg-surface text-evergreen shadow-[0_0_0_1px_var(--shell-line),inset_0_1px_0_var(--core-highlight),var(--shadow-sm)] hover:bg-muted/70',
  ghost: 'text-forest hover:bg-mint/70',
  danger: 'bg-danger text-white hover:opacity-90',
  // For use on an inverted (foreground-coloured) surface, in either theme.
  inverse: 'bg-ivory text-evergreen shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] hover:bg-mint',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-7 text-[15px]',
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
