"use client";
import React from 'react';
export default function Badge({ children, variant = 'default', className = '' }) {
    const base = 'inline-block text-xs font-semibold px-2 py-1 rounded-full';
    const cls = [base];
    if (variant === 'default')
        cls.push('bg-gray-100 text-gray-800');
    if (variant === 'success')
        cls.push('bg-green-100 text-green-800');
    if (variant === 'danger')
        cls.push('bg-red-100 text-red-800');
    if (variant === 'muted')
        cls.push('bg-gray-50 text-gray-500');
    return <span className={`${cls.join(' ')} ${className}`}>{children}</span>;
}
