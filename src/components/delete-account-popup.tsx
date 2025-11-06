"use client"

import {useState} from "react"
import {toast} from "sonner"
import {Button} from "@/components/ui/button"
import {Trash2, X} from "lucide-react"
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs"
import {deleteAccount} from "@/app/(private)/settings/delete-account"

export function DeleteAccountPopup({
                                       open,
                                       onCloseAction,
                                       onDeletedAction,
                                   }: {
    open: boolean
    onCloseAction: () => void
    onDeletedAction: () => void
}) {
    const supabase = createClientComponentClient()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)

        const {data: {user}, error: userError} = await supabase.auth.getUser()
        if (userError || !user) {
            toast.error("No user found")
            setLoading(false)
            return
        }

        // Call server action directly
        const result = await deleteAccount(user.id)

        if (result.success) {
            toast.success("Account deleted successfully", {
                description: "Your account has been permanently removed.",
            })

            onDeletedAction()
            onCloseAction()
        } else {
            toast.error("Failed to delete account", {
                description: result.error ?? "Something went wrong. Please try again.",
            })
        }

        setLoading(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
                className="rounded-lg p-6 w-[400px] max-w-full shadow-lg flex flex-col gap-4 relative bg-white text-black border border-gray-200"
            >
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 text-gray-700 hover:text-gray-950"
                    onClick={onCloseAction}
                >
                    <X className="w-5 h-5"/>
                </Button>

                <h2 className="text-lg font-semibold text-center flex items-center justify-center gap-2 text-red-600">
                    <Trash2 className="w-5 h-5 text-red-600"/>
                    Delete Account
                </h2>
                <p className="text-sm text-gray-600 text-center">
                    Are you sure you want to permanently delete your account? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
