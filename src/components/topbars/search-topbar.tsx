"use client";

import {useEffect, useState} from "react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {SidebarTrigger} from "@/components/ui/sidebar";
import {topbarClasses} from "@/components/topbars/topbar-base";

export default function SearchTopbar() {
    const supabase = createClientComponentClient();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const {data} = await supabase.auth.getSession();
            setIsLoggedIn(!!data.session);
        };
        checkSession();
    }, [supabase]);

    return (
        <div className={`${topbarClasses} flex items-center gap-4 px-6`}>
            {isLoggedIn && (
                <>
                    <SidebarTrigger/>
                    <div className="h-6 w-[2px] bg-border flex-shrink-0"/>
                </>
            )}
            <h1 className="text-lg font-semibold">Search</h1>
        </div>
    );
}
