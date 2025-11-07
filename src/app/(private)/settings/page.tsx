"use client";

import {useEffect, useState} from "react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {Card, CardContent, CardHeader, CardTitle,} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import SettingsTopbar from "@/components/topbars/settings-topbar";
import {useSidebar} from "@/components/ui/sidebar";
import {toast} from "sonner";
import {AuthApiError} from "@supabase/supabase-js";
import {Eye, EyeOff} from "lucide-react";
import {DeleteAccountPopup} from "@/components/delete-account-popup";

export default function SettingsPage() {
    const supabase = createClientComponentClient();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [originalEmail, setOriginalEmail] = useState("");
    const [provider, setProvider] = useState<"email" | string | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [originalFullName, setOriginalFullName] = useState("");

    // Password change fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const {setOpen} = useSidebar();
    const [initialized, setInitialized] = useState(false);
    const [openPopup, setOpenPopup] = useState(false);

    // Close sidebar on mount
    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    // Fetch user info
    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            const {
                data: {session},
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
                console.error("Session fetch error:", sessionError.message);
                setLoading(false);
                return;
            }

            if (!session?.user) {
                console.warn("No user session found");
                setLoading(false);
                return;
            }

            const user = session.user;

            if (user) {
                setEmail(user.email ?? "");
                setOriginalEmail(user.email ?? "");
                setProvider(user.app_metadata?.provider ?? "email");

                const {data, error} = await supabase
                    .from("users")
                    .select("full_name")
                    .eq("id", user.id)
                    .single();

                if (!error && data) {
                    setFullName(data.full_name ?? "");
                    setOriginalFullName(data.full_name ?? "");
                }
            }

            setLoading(false);
        };

        fetchUserData();
    }, [supabase]);

    const handleUpdateProfile = async () => {
        setLoadingProfile(true);
        setMessage("");

        // Validate empty fields
        if (!fullName.trim() || !email.trim()) {
            toast.error("Missing information", {
                description: "Field cannot be empty.",
            });
            setLoadingProfile(false);
            return;
        }

        // Validate that full name only contains letters and spaces
        const nameRegex = /^[A-Za-z\s]+$/;
        if (!nameRegex.test(fullName)) {
            toast.error("Invalid name", {
                description: "Full name can only contain letters and spaces.",
            });
            // Revert to original
            setFullName(originalFullName);
            setLoadingProfile(false);
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Invalid email", {
                description: "Please enter a valid email address.",
            });
            // Revert to original
            setEmail(originalEmail);
            setLoadingProfile(false);
            return;
        }

        const {data: {user}} = await supabase.auth.getUser();
        if (!user) {
            toast.error("You are not logged in");
            setLoadingProfile(false);
            return;
        }

        const noChanges = fullName === originalFullName && email === originalEmail;
        if (noChanges) {
            toast.success("Profile updated successfully", {
                description: "No changes were made, but your profile is up to date.",
            });
            setLoadingProfile(false);
            return;
        }

        try {
            // Update full name in users table
            const {error: updateUserError} = await supabase
                .from("users")
                .update({full_name: fullName})
                .eq("id", user.id);

            if (updateUserError) throw updateUserError;

            const {error: updateAuthError} = await supabase.auth.updateUser({
                data: {full_name: fullName},
            });

            if (updateAuthError) throw updateAuthError;

            // Handle email update if changed
            if (provider === "email" && email !== user.email) {
                try {
                    const {data: authUpdateData, error: authUpdateError} = await supabase.auth.updateUser({email});

                    if (authUpdateError) {
                        if (authUpdateError.message.includes("already been registered")) {
                            toast.error("Email already in use", {
                                description: "Please choose a different email.",
                            });
                            setEmail(originalEmail);
                            setLoadingProfile(false);
                            return;
                        }
                        throw authUpdateError;
                    }

                    // Supabase sends verification email — no change yet
                    toast.success("Verification email sent", {
                        description:
                            "We've sent a verification link to your new email. Please verify to complete the update.",
                        duration: 8000,
                    });

                    // Revert UI to show old email until verified
                    setEmail(originalEmail);
                    setLoadingProfile(false);
                    return;

                } catch (e) {
                    console.error("Email update failed:", e);
                    toast.error("Error updating email", {description: "Something went wrong."});
                    setEmail(originalEmail);
                    setLoadingProfile(false);
                    return;
                }
            }

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof AuthApiError) {
                toast.error("Authentication error", {description: err.message});
            } else if (err instanceof Error) {
                toast.error("Error updating profile", {description: err.message});
            } else {
                toast.error("Error updating profile", {
                    description: "Something went wrong.",
                });
            }
            // On any unexpected error, revert both fields
            setFullName(originalFullName);
            setEmail(originalEmail);
        } finally {
            setLoadingProfile(false);
        }

        // Save updated originals after success
        setOriginalFullName(fullName);
        setOriginalEmail(email);
    };

    const handleChangePassword = async () => {
        setLoadingPassword(true);

        const {
            data: {user},
        } = await supabase.auth.getUser();

        if (!user) {
            toast.error("You are not logged in");
            setLoadingPassword(false);
            return;
        }

        if (!currentPassword.trim() || !newPassword.trim()) {
            toast.error("Missing fields", {
                description: "Please fill in both current and new password.",
            });
            setLoadingPassword(false);
            return;
        }

        // Validate new password strength
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+=\-{};:'",.<>/?]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            toast.error("Weak password", {
                description:
                    "Password must be at least 8 characters long and include at least one letter and one number.",
            });
            setLoadingPassword(false);
            return;
        }

        try {
            // Verify current password
            const {error: verifyError} = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: currentPassword,
            });

            if (verifyError) {
                toast.error("Incorrect password", {
                    description: "Your current password is incorrect.",
                });
                setLoadingPassword(false);
                return;
            }

            // Update new password
            const {error: updateError} = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                toast.error("Failed to change password", {
                    description: updateError.message,
                });
                setLoadingPassword(false);
                return;
            }

            toast.success("Password updated successfully", {
                description: "You can now log in with your new password.",
            });

            setCurrentPassword("");
            setNewPassword("");
        } catch (err) {
            console.error(err);
            toast.error("Error changing password", {
                description: "Something went wrong.",
            });
        } finally {
            setLoadingPassword(false);
        }
    };

    const handleOpenPopup = () => {
        setOpenPopup(true);
    };

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    return (
        <div className="flex flex-col h-full">
            <SettingsTopbar/>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* --- Account Info --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                            />
                        </div>

                        {provider === "email" ? (
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
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Account managed via {provider}. Email changes not available.
                            </p>
                        )}

                        <Button onClick={handleUpdateProfile} disabled={loadingProfile}>
                            {loadingProfile ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardContent>
                </Card>

                {/* --- Change Password Section --- */}
                {provider === "email" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Current Password */}
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        id="currentPassword"
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        tabIndex={-1}
                                    >
                                        {showCurrentPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword((prev) => !prev)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        tabIndex={-1}
                                    >
                                        {showNewPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                            </div>

                            <Button onClick={handleChangePassword} disabled={loadingPassword}>
                                {loadingPassword ? "Saving..." : "Change Password"}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* --- Danger Zone --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={handleOpenPopup}>
                            Delete Account
                        </Button>
                    </CardContent>
                </Card>

                <DeleteAccountPopup
                    open={openPopup}
                    onCloseAction={() => setOpenPopup(false)}
                    onDeletedAction={async () => {
                        await supabase.auth.signOut();
                        window.location.href = "/";
                    }}
                />

            </div>
        </div>
    );
}
