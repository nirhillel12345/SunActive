"use client";
import React from 'react';
export default function Input({ label, className = '', ...props }) {
    return (<label className="block">
      {label && <div className="text-sm text-gray-600 mb-1">{label}</div>}
      <input className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200 ${className}`} {...props}/>
    </label>);
}
