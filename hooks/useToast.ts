
import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';
import { Toast } from '../types';

export const useToast = () => {
    const { dispatch } = useContext(ToastContext);

    const addToast = (message: string, type: Toast['type']) => {
        dispatch({ type: 'ADD_TOAST', payload: { message, type } });
    };

    return { addToast };
};