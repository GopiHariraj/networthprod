"use client";

import { SWRConfig } from 'swr';
import React, { ReactNode } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const SWRProvider = ({ children }: { children: ReactNode }) => {
    return (
        <SWRConfig
            value={{
                fetcher,
                revalidateOnFocus: false,
                revalidateIfStale: false,
                dedupingInterval: 5000,
            }}
        >
            {children}
        </SWRConfig>
    );
};
