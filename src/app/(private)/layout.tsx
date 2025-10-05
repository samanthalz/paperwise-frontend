"use client";

import {SidebarProvider} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";
import React, {useEffect, useState} from "react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

export default function PrivateLayout({children}: { children: React.ReactNode }) {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const {data} = await supabase.auth.getSession();
            setIsLoggedIn(!!data.session);
            setLoading(false);
        };
        checkSession();
    }, [supabase]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <SidebarProvider>
            <div className="flex w-full h-screen">
                {/* Only render the sidebar if logged in */}
                {isLoggedIn && <AppSidebar/>}
                <main className="flex-1 flex flex-col">{children}</main>
            </div>
        </SidebarProvider>
    );
}
