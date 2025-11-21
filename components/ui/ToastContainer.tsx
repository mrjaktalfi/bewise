
import React, { useContext, useEffect } from 'react';
import { ToastContext } from '../../context/ToastContext';

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const baseClasses = 'relative w-full max-w-sm p-4 rounded-xl shadow-lg text-white flex items-center';
    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <p className="flex-grow text-sm font-medium">{message}</p>
            <button onClick={onClose} className="ml-4 text-xl font-semibold leading-none">&times;</button>
        </div>
    );
};

const ToastContainer: React.FC = () => {
    const { state, dispatch } = useContext(ToastContext);
    const { toasts } = state;

    const handleClose = (id: number) => {
        dispatch({ type: 'REMOVE_TOAST', payload: id });
    };

    return (
        <div className="fixed top-5 right-5 z-[100] space-y-3">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => handleClose(toast.id)}
                />
            ))}
        </div>
    );
};

export default ToastContainer;