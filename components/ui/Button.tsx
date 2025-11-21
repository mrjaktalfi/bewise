import React, { useRef, useEffect } from 'react';

// FIX: Omit 'onClick' from the base HTML attributes to resolve a type conflict,
// as this component uses a custom event listener implementation.
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLElement>, 'onClick'> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  className?: string;
  isIcon?: boolean;
  onClick?: (event: MouseEvent) => void;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, style: propStyle, isIcon = false, onClick, ...props }) => {
  const ref = useRef<HTMLElement>(null);
  const onClickRef = useRef(onClick);

  // Always keep the latest onClick handler in the ref.
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // Attach the event listener only once.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // This listener function's reference is stable.
    const listener = (event: Event) => {
      // It calls the latest handler from the ref.
      if (onClickRef.current) {
        onClickRef.current(event as MouseEvent);
      }
    };
    
    element.addEventListener('click', listener);
    
    return () => {
      element.removeEventListener('click', listener);
    };
  }, []); // Empty dependency array ensures this runs only on mount/unmount.

  const finalClassName = `cursor-pointer ${className || ''}`.trim();
  // We must not pass onClick down to the web component if we handle it manually.
  const { onClick: _, ...otherProps } = props as any;
  const allProps: any = { ...otherProps, class: finalClassName, ref };


  // --- Icon Button Logic ---
  if (isIcon) {
    const iconStyle: React.CSSProperties = { ...propStyle };
    if (variant === 'danger') {
      // For danger, use a specific red color
      iconStyle['--md-icon-button-icon-color'] = '#dc2626'; // red-600
    } else {
      // For standard icon buttons, use a neutral but visible color
      iconStyle['--md-icon-button-icon-color'] = '#64748b'; // slate-500
    }
    allProps.style = iconStyle;
    return React.createElement('md-icon-button', allProps, children);
  }

  // --- Standard Button Logic ---
  // Auto-detect if the button has an icon to apply the correct attribute for styling.
  // FIX: Cast child.props to 'any' to safely access the 'slot' property,
  // resolving the TypeScript error about 'slot' not existing on type 'unknown'.
  const hasIcon = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && (child.props as any).slot === 'icon'
  );

  if (hasIcon) {
    allProps['has-icon'] = ''; // This attribute tells the MWC how to space the content
  }

  const getVariantStyles = () => {
    const shapeStyles = {
        '--md-filled-button-container-shape': '0.75rem', // Corresponds to Tailwind 'xl'
        '--md-tonal-button-container-shape': '0.75rem',
    };

    switch (variant) {
      case 'danger':
        return {
          ...shapeStyles,
          '--md-filled-button-container-color': '#dc2626',
          '--md-filled-button-label-text-color': '#ffffff',
          '--md-filled-button-hover-container-color': '#b91c1c',
        };
      case 'primary':
        return {
          ...shapeStyles,
          '--md-filled-button-container-color': '#7c3aed',
          '--md-filled-button-label-text-color': '#ffffff',
          '--md-filled-button-hover-container-color': '#6d28d9',
        };
      case 'secondary':
      default:
        return shapeStyles;
    }
  };

  allProps.style = { ...getVariantStyles(), ...propStyle };
  const ButtonComponent = variant === 'secondary' ? 'md-tonal-button' : 'md-filled-button';

  return React.createElement(ButtonComponent, allProps, children);
};

export default Button;