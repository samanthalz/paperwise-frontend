"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {Star} from "lucide-react";
import type {Message} from "./paper-tabs/AskPaperTab";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {useRouter} from "next/navigation";

type AddPaperButtonProps = {
    pdfId: string | null;
    messages: Message[];
    onChangeAction: (userPaperId: number | null, isSaved: boolean) => void;
    disabled?: boolean;
};

export function AddPaperButton({
                                   pdfId,
                                   messages,
                                   onChangeAction,
                                   disabled = false, // default: false
                               }: AddPaperButtonProps) {
    const supabase = createClientComponentClient();
    const router = useRouter();

    const [userPaperId, setUserPaperId] = useState<number | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [showLoginDialog, setShowLoginDialog] = useState(false);

    /** Check if user has saved paper */
    useEffect(() => {
        if (!pdfId) return;

        const init = async () => {
            const {data: userData} = await supabase.auth.getUser();
            if (!userData?.user) return;

            const {data: existing} = await supabase
                .from("user_papers")
                .select("id")
                .eq("user_id", userData.user.id)
                .eq("pdf_id", pdfId)
                .maybeSingle();

            if (existing?.id) {
                setUserPaperId(existing.id);
                setIsSaved(true);
                onChangeAction(existing.id, true);
            }
        };

        init();
    }, [pdfId, supabase, onChangeAction]);

    /** Save/Delete paper */
    const handleSavePaper = async () => {
        if (disabled) return; // ✅ prevents click when disabled

        const {data: userData} = await supabase.auth.getUser();
        if (!userData?.user) {
            setShowLoginDialog(true);
            return;
        }
        if (!pdfId) return;

        if (userPaperId) {
            // delete saved paper
            await supabase.from("user_papers").delete().eq("id", userPaperId);
            setUserPaperId(null);
            setIsSaved(false);
            onChangeAction(null, false);
            return;
        }

        // save paper
        const {data: insertData} = await supabase
            .from("user_papers")
            .insert({user_id: userData.user.id, pdf_id: pdfId})
            .select("id")
            .single();

        if (!insertData?.id) return;
        setUserPaperId(insertData.id);
        setIsSaved(true);
        onChangeAction(insertData.id, true);

        // save existing messages if any
        const unsavedMessages = messages.filter((m) => !m.dbId);
        if (unsavedMessages.length > 0) {
            try {
                await supabase
                    .from("paper_chats")
                    .insert(
                        unsavedMessages.map((m) => ({
                            user_paper_id: insertData.id,
                            role: m.role,
                            message: m.text,
                        }))
                    )
                    .select("id");
            } catch (err) {
                console.error("Error saving existing messages:", err);
            }
        }
    };

    return (
        <>
            <Button
                onClick={handleSavePaper}
                disabled={disabled}
                className="flex items-center gap-1"
            >
                <Star className={isSaved ? "fill-white" : "stroke-white"}/>
                {isSaved ? "Saved" : disabled ? "Preparing..." : "Save"}
            </Button>

            <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Login Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            You must be logged in to save this paper. Would you like to log in now?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowLoginDialog(false)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push("/login")}>
                            Go to Login
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
