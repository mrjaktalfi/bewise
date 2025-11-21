
import React, { createContext, useReducer, Dispatch, ReactNode } from 'react';
import { Toast } from '../types';

type ToastAction = 
  | { type: 'ADD_TOAST'; payload: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; payload: number };

interface ToastState {
  toasts: Toast[];
}

const ToastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, { ...action.payload, id: Date.now() }],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };
    default:
      return state;
  }
};

const initialState: ToastState = {
  toasts: [],
};

export const ToastContext = createContext<{
  state: ToastState;
  dispatch: Dispatch<ToastAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(ToastReducer, initialState);

  return (
    <ToastContext.Provider value={{ state, dispatch }}>
      {children}
    </ToastContext.Provider>
  );
};