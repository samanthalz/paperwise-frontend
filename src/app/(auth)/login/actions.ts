'use server'

import {createClient} from '@/utils/supabase/server'

export async function login(_: any, formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const {error} = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        // Customize Supabase error messages
        let customError = 'Something went wrong. Please try again.'

        if (error.message.includes('Invalid login credentials')) {
            customError = 'Incorrect email or password. Please try again.'
        } else if (error.message.includes('Email not confirmed')) {
            customError = 'Please verify your email before logging in.'
        }

        return {error: customError}
    }

    return {success: true}
}
