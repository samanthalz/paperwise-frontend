"use client";

import {SidebarProvider} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";
import React from "react";

export default function PrivateLayout({children}: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex w-full h-screen">
                <AppSidebar/>
                <main className="flex-1 flex flex-col">{children}</main>
            </div>
        </SidebarProvider>
    );
}
