"use client";

import {useEffect, useState} from "react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {ScrollArea} from "@/components/ui/scroll-area";
import SettingsTopbar from "@/components/topbars/settings-topbar";

export default function SettingsPage() {
    const supabase = createClientComponentClient();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // ✅ Fetch user info on mount
    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            const {
                data: {user},
                error: authError,
            } = await supabase.auth.getUser();

            if (authError) {
                console.error("Auth error:", authError.message);
                setLoading(false);
                return;
            }

            if (user) {
                setEmail(user.email ?? "");

                // Pull fullName from `users` table
                const {data, error} = await supabase
                    .from("users")
                    .select("full_name")
                    .eq("id", user.id) // assuming "id" is your PK and matches auth.user.id
                    .single();

                if (!error && data) {
                    setFullName(data.full_name ?? "");
                }
            }
            setLoading(false);
        };

        fetchUserData();
    }, [supabase]);

    // ✅ Update Profile
    const handleUpdateProfile = async () => {
        setLoading(true);
        setMessage("");

        const {
            data: {user},
        } = await supabase.auth.getUser();
        if (!user) {
            setMessage("Not logged in");
            setLoading(false);
            return;
        }

        try {
            // Update full name in users table
            const {error: updateUserError} = await supabase
                .from("users")
                .update({full_name: fullName})
                .eq("id", user.id);

            if (updateUserError) throw updateUserError;

            // Update email and password in Auth
            const {error: authUpdateError} = await supabase.auth.updateUser({
                email: email || undefined,
                password: password || undefined,
            });

            if (authUpdateError) throw authUpdateError;

            setMessage("Profile updated successfully!");
        } catch (err: unknown) {
            console.error(err);

            // Narrow the type to get the message safely
            if (err instanceof Error) {
                setMessage(err.message);
            } else if (typeof err === "string") {
                setMessage(err);
            } else {
                setMessage("Error updating profile.");
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ Delete Account
    const handleDeleteAccount = async () => {
        setLoading(true);
        setMessage("Deleting account...");

        // ⚠️ Supabase does not allow client-side account deletion directly
        // You’d need to handle deletion securely via a serverless function (e.g. Edge Function)
        // Example: Call your API route here.
        setTimeout(() => {
            setMessage("Account deletion must be handled via server.");
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full">
            <SettingsTopbar/>

            <div className="flex-1 p-6 overflow-y-auto">
                <Tabs defaultValue="account" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="recent">Recent</TabsTrigger>
                    </TabsList>

                    <TabsContent value="account">
                        <Card>
                            <CardHeader>
                                <CardTitle>Account Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Full Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter new email"
                                        type="email"
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        type="password"
                                    />
                                </div>

                                <Button onClick={handleUpdateProfile} disabled={loading}>
                                    {loading ? "Saving..." : "Save Changes"}
                                </Button>

                                {message && (
                                    <p className="text-sm text-muted-foreground">{message}</p>
                                )}

                                <hr className="my-4"/>

                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteAccount}
                                    disabled={loading}
                                >
                                    Delete Account
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="recent">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent View</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <p className="text-sm text-muted-foreground">
                                        You have no recent activity yet.
                                    </p>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
