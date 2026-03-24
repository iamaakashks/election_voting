import React from 'react';
import { XCircle, CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

interface AlertModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-[#121214] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-zinc-200 dark:border-white/10 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-white/10 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  onClose,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-emerald-600" />,
    error: <XCircle className="w-12 h-12 text-red-600" />,
    warning: <AlertTriangle className="w-12 h-12 text-amber-600" />,
    info: <Info className="w-12 h-12 text-blue-600" />,
    confirm: <AlertCircle className="w-12 h-12 text-blue-600" />
  };

  const bgColors = {
    success: 'from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5',
    error: 'from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-500/5',
    warning: 'from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/5',
    info: 'from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5',
    confirm: 'from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5'
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-[#121214] rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-white/10 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${bgColors[type]} mb-4`}>
            {icons[type]}
          </div>

          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>

          <div className="text-zinc-600 dark:text-zinc-400 mb-6">
            {typeof message === 'string' ? (
              <p className="whitespace-pre-line">{message}</p>
            ) : (
              message
            )}
          </div>

          <div className="flex gap-3">
            {onConfirm && (
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 ${
                  type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : type === 'error'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  confirmText
                )}
              </button>
            )}
            <button
              onClick={() => {
                if (onCancel) onCancel();
                onClose();
              }}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
