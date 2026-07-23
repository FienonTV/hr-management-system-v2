import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary-600 text-white hover:bg-primary-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
  };
  return (
    <button
      ref={ref}
      className={`px-4 py-2 rounded font-medium transition-colors ${variants[variant]} ${className || ''}`}
      {...props}
    />
  );
});
Button.displayName = "Button";
