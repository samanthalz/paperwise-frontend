"use client";

import {useEffect, useState} from "react";
import {getVolatile, setVolatile} from "@/hooks/volatileCache";

export function useVolatileSession<T>(key: string, initialValue: T) {
    const [value, setValue] = useState<T>(() => getVolatile(key, initialValue));

    // Sync global cache when state changes
    useEffect(() => {
        setVolatile(key, value);
    }, [key, value]);

    return [value, setValue] as const;
}
