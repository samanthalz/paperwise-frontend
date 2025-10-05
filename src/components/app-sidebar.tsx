"use client";

import Link from "next/link";
import {FileText, LogOut, Search, Settings} from "lucide-react";
import {useEffect, useState} from "react";
import {usePathname, useRouter} from "next/navigation";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {cn} from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";

const topItems = [
    {title: "Documents", url: "/dashboard", icon: FileText},
    {title: "Search", url: "/search", icon: Search},
];

export function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClientComponentClient();

    const [user, setUser] = useState<{ fullName: string; email: string } | null>(
        null
    );

    useEffect(() => {
        const fetchUser = async () => {
            const {data} = await supabase.auth.getSession();
            const currentUser = data?.session?.user;

            if (currentUser) {
                setUser({
                    fullName: currentUser.user_metadata?.full_name ?? "User",
                    email: currentUser.email ?? "",
                });
            }
        };

        fetchUser();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <Sidebar>
            <SidebarContent className="flex flex-col justify-between h-full">
                {/* Top Section */}
                <div>
                    <SidebarGroup>
                        <SidebarGroupLabel className="mb-4">PaperWise</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {topItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <Link
                                                href={item.url}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                                                    pathname === item.url
                                                        ? "bg-primary/10 text-primary font-semibold"
                                                        : "hover:bg-muted/60 text-muted-foreground"
                                                )}
                                            >
                                                <item.icon className="w-4 h-4"/>
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </div>

                {/* Bottom Section */}
                <div className="p-4 border-t">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link
                                    href="/settings"
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                                        pathname === "/settings"
                                            ? "bg-primary/10 text-primary font-semibold"
                                            : "hover:bg-muted/60 text-muted-foreground"
                                    )}
                                >
                                    <Settings className="w-4 h-4"/>
                                    <span>Settings</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* User Info + Logout */}
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src="/avatar.jpg" alt="@user"/>
                                    <AvatarFallback>{user?.fullName?.[0] ?? "U"}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col max-w-[120px]">
                                    <p className="text-sm font-medium truncate">
                                        {user?.fullName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="ml-2 bg-transparent hover:bg-muted"
                            >
                                <LogOut className="w-5 h-5 text-black"/>
                            </Button>
                        </div>
                    </SidebarMenu>
                </div>
            </SidebarContent>
        </Sidebar>
    );
}
