import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

const Toast = ({ message, onClose, duration = 4000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="toast-overlay">
            <div className="toast-container">
                <div className="toast-icon">
                    <CheckCircle size={24} />
                </div>
                <div className="toast-content">
                    <p className="toast-message">{message}</p>
                </div>
                <button className="toast-close" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
