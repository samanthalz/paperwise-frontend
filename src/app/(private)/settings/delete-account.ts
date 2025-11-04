'use server'

import {createClient as createSupabaseAdmin} from '@supabase/supabase-js'

type DeleteAccountResult = {
    success: boolean
    error?: string
}

export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
    try {
        if (!userId) {
            return {success: false, error: 'Missing user ID.'}
        }

        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
        const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
            console.error('Missing Supabase environment variables.')
            return {success: false, error: 'Server misconfiguration.'}
        }

        const supabaseAdmin = createSupabaseAdmin(SUPABASE_URL, SERVICE_ROLE_KEY)

        // Delete user from Supabase Auth
        const {error: deleteAuthError} = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
            throw new Error(`Auth deletion failed: ${deleteAuthError.message}`)
        }

        // Delete user data from your 'users' table
        const {error: deleteUserError} = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)

        if (deleteUserError) {
            throw new Error(`Database deletion failed: ${deleteUserError.message}`)
        }

        return {success: true}
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error.'
        console.error('Error deleting account:', message)
        return {success: false, error: message}
    }
}
