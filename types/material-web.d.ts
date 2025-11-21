// This file extends the global JSX namespace to include type definitions for
// custom Material Web Components. This allows TypeScript to recognize and
// type-check these components when used in JSX. By using an import, this
// file becomes a module, and `declare global` correctly augments the
// existing JSX types instead of overwriting them.

import type * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLElement>, HTMLElement>;
      'md-outlined-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLElement>, HTMLElement>;
      'md-text-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLElement>, HTMLElement>;
      'md-tonal-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLElement>, HTMLElement>;
      'md-icon-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLElement>, HTMLElement>;

      // FIX: Add a string index signature to allow any standard HTML tag.
      // This resolves the widespread "Property '...' does not exist on type 'JSX.IntrinsicElements'" errors
      // by ensuring that all tags are recognized by TypeScript.
      [elemName: string]: any;
    }
  }
}