"use client";
import React from 'react';
export default function Button({ variant = 'primary', className = '', children, ...props }) {
    // mobile-first: ensure minimum touch target height (44px) and comfortable padding
    const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none min-h-[44px]';
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-white text-gray-700 border hover:bg-gray-50',
        danger: 'bg-red-600 text-white hover:bg-red-700'
    };
    return (<button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>);
}
