'use server'

import {createClient as createSupabaseAdmin} from '@supabase/supabase-js'

export async function deleteAccount(userId: string) {
    try {
        // Create admin client (service role key)
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
        )

        // Delete user from auth
        const {error: deleteAuthError} = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteAuthError) throw deleteAuthError

        // Optionally, clean up user data in your DB
        const {error: deleteUserError} = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)
        if (deleteUserError) throw deleteUserError

        return {success: true}
    } catch (err: any) {
        console.error('Error deleting account:', err.message)
        return {success: false, error: err.message}
    }
}
