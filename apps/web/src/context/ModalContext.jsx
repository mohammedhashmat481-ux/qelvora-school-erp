import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X,
  ShieldAlert,
  Info
} from 'lucide-react';

const ModalContext = createContext(null);

// Global bridge reference for non-component calls (e.g. services or plain functions)
let globalConfirmBridge = null;
let globalAlertBridge = null;

export const confirmModal = (options) => {
  if (globalConfirmBridge) {
    return globalConfirmBridge(options);
  }
  // Fallback to native if context is not yet mounted
  return Promise.resolve(window.confirm(typeof options === 'string' ? options : (options?.message || 'Are you sure?')));
};

export const alertModal = (options) => {
  if (globalAlertBridge) {
    return globalAlertBridge(options);
  }
  window.alert(typeof options === 'string' ? options : (options?.message || 'Notice'));
  return Promise.resolve();
};

// Bind to window for universal availability across all scripts
if (typeof window !== 'undefined') {
  window.confirmModal = confirmModal;
  window.alertModal = alertModal;
}

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'confirm', // 'confirm' | 'alert'
    title: '',
    subtitle: '',
    message: '',
    details: '',
    type: 'danger', // 'danger' | 'warning' | 'info' | 'success'
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmBtnClass: '',
    icon: null,
  });

  const resolverRef = useRef(null);

  const closeModal = useCallback((result = false) => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const openConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      let config = {};
      if (typeof options === 'string') {
        const lower = options.toLowerCase();
        const isDelete = lower.includes('delete') || lower.includes('remove') || lower.includes('hard delete') || lower.includes('deallocate') || lower.includes('revoke');
        const isWarning = lower.includes('reset') || lower.includes('notice') || lower.includes('archive') || lower.includes('conflict');
        
        config = {
          title: isDelete ? 'Confirm Deletion' : isWarning ? 'Attention Required' : 'Please Confirm',
          subtitle: isDelete ? 'This action cannot be undone' : 'Institution Audit Log Protected',
          message: options,
          type: isDelete ? 'danger' : isWarning ? 'warning' : 'info',
          confirmText: isDelete ? 'Yes, Delete' : 'Confirm & Proceed',
          cancelText: 'Cancel'
        };
      } else if (options && typeof options === 'object') {
        const isDelete = options.type === 'danger' || (!options.type && (options.title?.toLowerCase().includes('delete') || options.message?.toLowerCase().includes('delete')));
        
        config = {
          title: options.title || (isDelete ? 'Confirm Deletion' : 'Confirm Action'),
          subtitle: options.subtitle || (isDelete ? 'This action cannot be undone' : 'Institutional Record Management'),
          message: options.message || 'Are you sure you want to proceed?',
          details: options.details || '',
          type: options.type || (isDelete ? 'danger' : 'info'),
          confirmText: options.confirmText || (isDelete ? 'Yes, Delete' : 'Confirm & Proceed'),
          cancelText: options.cancelText || 'Cancel',
          confirmBtnClass: options.confirmBtnClass || '',
          icon: options.icon || null
        };
      }

      setModalState({
        isOpen: true,
        mode: 'confirm',
        ...config
      });
    });
  }, []);

  const openAlert = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      let config = {};
      if (typeof options === 'string') {
        config = {
          title: 'System Notice',
          subtitle: 'Institutional Notification',
          message: options,
          type: 'info',
          confirmText: 'Acknowledge'
        };
      } else if (options && typeof options === 'object') {
        config = {
          title: options.title || 'System Notice',
          subtitle: options.subtitle || 'Institutional Notification',
          message: options.message || '',
          details: options.details || '',
          type: options.type || 'info',
          confirmText: options.confirmText || 'Close Window'
        };
      }

      setModalState({
        isOpen: true,
        mode: 'alert',
        ...config
      });
    });
  }, []);

  useEffect(() => {
    globalConfirmBridge = openConfirm;
    globalAlertBridge = openAlert;
    return () => {
      globalConfirmBridge = null;
      globalAlertBridge = null;
    };
  }, [openConfirm, openAlert]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!modalState.isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen, closeModal]);

  // Style helpers based on modal type
  const getTypeTheme = () => {
    switch (modalState.type) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-50 border-rose-200/80 text-rose-600',
          badgeText: 'text-rose-700 bg-rose-50 border-rose-200',
          badgeLabel: 'CRITICAL ACTION',
          headerBorder: 'border-rose-100',
          primaryBtn: modalState.confirmBtnClass || 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-200/80 text-amber-600',
          badgeText: 'text-amber-800 bg-amber-50 border-amber-200',
          badgeLabel: 'WARNING NOTICE',
          headerBorder: 'border-amber-100',
          primaryBtn: modalState.confirmBtnClass || 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/20'
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-600',
          badgeText: 'text-emerald-800 bg-emerald-50 border-emerald-200',
          badgeLabel: 'CONFIRMED SUCCESS',
          headerBorder: 'border-emerald-100',
          primaryBtn: modalState.confirmBtnClass || 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20'
        };
      case 'info':
      default:
        return {
          icon: <HelpCircle className="w-6 h-6 text-[#172B4D]" />,
          iconBg: 'bg-blue-50 border-blue-200/80 text-[#172B4D]',
          badgeText: 'text-[#172B4D] bg-blue-50 border-blue-200',
          badgeLabel: 'CONFIRM ACTION',
          headerBorder: 'border-blue-100',
          primaryBtn: modalState.confirmBtnClass || 'bg-[#29456D] hover:bg-[#172B4D] active:bg-[#0f1d35] text-white shadow-blue-900/20'
        };
    }
  };

  const theme = getTypeTheme();

  return (
    <ModalContext.Provider value={{ confirmModal: openConfirm, alertModal: openAlert, closeModal }}>
      {children}

      {/* ─── CLASSIC BESPOKE CRM CONFIRMATION & ALERT MODAL ─── */}
      {modalState.isOpen && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => closeModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden transform transition-all duration-200 scale-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Bar with Branding & Status Pill */}
            <div className="bg-[#172B4D] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-100">
                  Qelvora School CRM • Verification
                </span>
              </div>
              <button
                type="button"
                onClick={() => closeModal(false)}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Icon Badge */}
                <div className={`p-3.5 rounded-2xl border shrink-0 ${theme.iconBg} shadow-xs`}>
                  {theme.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${theme.badgeText}`}>
                      {theme.badgeLabel}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                    {modalState.title}
                  </h3>
                  {modalState.subtitle && (
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {modalState.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="mt-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-200/70 rounded-2xl p-4">
                {modalState.message}
              </div>

              {/* Extra Details Box (if provided) */}
              {modalState.details && (
                <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 font-mono">
                  {modalState.details}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200/80 flex items-center justify-end gap-3">
              {modalState.mode === 'confirm' && (
                <button
                  type="button"
                  onClick={() => closeModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  {modalState.cancelText}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => closeModal(true)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 ${theme.primaryBtn}`}
              >
                <span>{modalState.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    // If used outside provider, fallback to global bridges
    return {
      confirmModal,
      alertModal,
      closeModal: () => {}
    };
  }
  return context;
};

export default ModalContext;

