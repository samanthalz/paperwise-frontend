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
    useSidebar,
} from "@/components/ui/sidebar";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog";

const topItems = [
    {title: "Documents", url: "/dashboard", icon: FileText},
    {title: "Search", url: "/search", icon: Search},
];

export function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClientComponentClient();
    const {setOpen} = useSidebar();

    const [initialized, setInitialized] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [user, setUser] = useState<{ fullName: string; email: string } | null>(
        null
    );

    // Close sidebar on the first load only
    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    // Fetch user info and listen for realtime updates
    useEffect(() => {
        let subscription: ReturnType<typeof supabase.channel> | null = null;

        const fetchUserAndSubscribe = async () => {
            // Get current user
            const {data: {user}, error} = await supabase.auth.getUser();
            if (error || !user) {
                console.error("Error fetching user:", error);
                return;
            }

            // Fetch initial profile
            const {data: profile, error: profileError} = await supabase
                .from("users")
                .select("full_name")
                .eq("id", user.id)
                .maybeSingle();

            if (profileError) console.error("Profile fetch error:", profileError);

            setUser({
                fullName: profile && profile.full_name ? profile.full_name : "User",
                email: user.email || "",
            });

            // Subscribe to realtime changes
            subscription = supabase
                .channel(`user-profile-listener-${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "users",
                        filter: `id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log("Realtime payload:", payload);
                        const updatedName = payload.new.full_name;
                        setUser((prev) =>
                            prev ? {...prev, fullName: updatedName ?? prev.fullName} : prev
                        );
                    }
                )
                .subscribe((status) => {
                    console.log("Subscription status:", status);
                });
        };

        fetchUserAndSubscribe();

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
                console.log("Realtime subscription removed");
            }
        };
    }, [supabase]);

    return (
        <>
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
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                            {user?.fullName?.[0]?.toUpperCase() ?? "U"}
                                        </AvatarFallback>
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
                                {/* Logout icon button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsLogoutOpen(true)}
                                    className="ml-2 bg-transparent hover:bg-muted"
                                >
                                    <LogOut className="w-5 h-5 text-black"/>
                                </Button>
                            </div>
                        </SidebarMenu>
                    </div>
                </SidebarContent>
            </Sidebar>

            {/* Logout Confirmation Dialog */}
            <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Logout</DialogTitle>
                    </DialogHeader>
                    <p>Are you sure you want to log out?</p>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsLogoutOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                await supabase.auth.signOut();
                                router.push("/");
                            }}
                        >
                            Logout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
