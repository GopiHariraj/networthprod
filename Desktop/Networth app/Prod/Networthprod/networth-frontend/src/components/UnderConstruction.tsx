"use client";

import React from 'react';

export default function UnderConstruction({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 animate-pulse">
                🚧
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{title}</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
                We are currently building this feature. Check back soon for updates!
            </p>
        </div>
    );
}
