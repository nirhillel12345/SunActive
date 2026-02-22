"use client";
import { useEffect } from 'react';
export default function Drawer({ open, onClose, children }) {
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape')
            onClose(); }
        if (open)
            document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    // prevent body scroll while drawer is open to avoid layout jump on mobile
    useEffect(() => {
        const original = document.body.style.overflow;
        if (open)
            document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = original; };
    }, [open]);
    return (<div className={`fixed inset-0 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* aside on higher z so it is always above the backdrop */}
      <aside className={`fixed left-0 top-0 bottom-0 w-full max-w-[80vw] bg-white shadow transform transition-transform will-change-transform ${open ? 'translate-x-0' : '-translate-x-full'} z-50`}>
        <div className="p-4 h-full overflow-y-auto">{children}</div>
      </aside>
      {/* overlay/backdrop sits under the aside and should not block pointer events to the drawer */}
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'} z-40`} onClick={onClose}/>
    </div>);
}
