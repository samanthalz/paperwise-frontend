"use client";

import React, {useEffect, useState} from "react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {SidebarProvider} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";

export default function PrivateLayout({children}: { children: React.ReactNode }) {
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const checkSession = async () => {
            const {data: {user}, error} = await supabase.auth.getUser();
            if (error || !user) {
                setHasSession(false);
            } else {
                setHasSession(true);
            }
        };

        checkSession();
    }, [supabase]);

    if (hasSession === null) {
        // Optional: loading skeleton or spinner while checking
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <SidebarProvider>
            <div className="flex w-full h-screen">
                {hasSession && <AppSidebar/>} {/* 👈 Only show sidebar if logged in */}
                <main className="flex-1 flex flex-col">{children}</main>
            </div>
        </SidebarProvider>
    );
}
