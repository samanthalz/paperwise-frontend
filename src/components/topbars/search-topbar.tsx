"use client";

import {useEffect, useState} from "react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {SidebarTrigger} from "@/components/ui/sidebar";
import {topbarClasses} from "@/components/topbars/topbar-base";
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";

export default function SearchTopbar() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const {data} = await supabase.auth.getSession();
            setIsLoggedIn(!!data.session);
        };
        checkSession();
    }, [supabase]);

    return (
        <div className={`${topbarClasses} flex items-center justify-between px-6`}>
            <div className="flex items-center gap-4">
                {isLoggedIn && (
                    <>
                        <SidebarTrigger/>
                        <div className="h-6 w-[2px] bg-border flex-shrink-0"/>
                    </>
                )}
                <h1 className="text-lg font-semibold" style={{color: "var(--popup-heading)"}}>
                    Search
                </h1>
            </div>

            {/* Right-side buttons */}
            {!isLoggedIn && (
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/login")}>
                        Login
                    </Button>
                    <Button onClick={() => router.push("/register")}>Register</Button>
                </div>
            )}
        </div>
    );
}
