import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', children, ...props }, ref) => {
  const variants = {
    default: 'bg-primary-600 text-white hover:bg-primary-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
  };
  const baseClasses = `inline-flex items-center justify-center whitespace-nowrap rounded font-medium transition-colors ${variants[variant]}`;
  const hasPadding = /\b(p[xyltrb]?-|p-)\b/.test(className || '');
  const paddingClass = hasPadding ? '' : 'px-4 py-2';
  return (
    <button
      ref={ref}
      className={`${baseClasses} ${paddingClass} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";
