'use server'

import {createClient} from '@/utils/supabase/server'
import {createClient as createSupabaseClient} from '@supabase/supabase-js'

type FormState = {
    error?: string
    success?: boolean
}

export async function registerUser(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    console.log('START registerUser')
    console.log({fullName, email})

    // ✅ 1. Password match check
    if (password !== confirmPassword) {
        return {error: 'Passwords do not match'}
    }

    // ✅ 2. Password strength check
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+=\-{};:'",.<>/?]{8,}$/
    if (!passwordRegex.test(password)) {
        return {
            error:
                'Password must be at least 8 characters long and contain at least one letter and one number.',
        }
    }

    const supabase = await createClient()

    console.log('Supabase client created')

    // ✅ 3. Create auth user
    const {data, error} = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {full_name: fullName},
        },
    })

    console.log('Signup result', {data, error})

    if (error || !data.user) {
        return {error: error?.message ?? 'Signup failed'}
    }

    const userId = data.user.id
    console.log('User created with ID:', userId)

    // ✅ 4. Insert into public users table
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
    )

    const {error: dbError} = await supabaseAdmin.from('users').insert({
        id: userId,
        full_name: fullName,
    })

    if (dbError) {
        return {error: dbError.message}
    }

    console.log('Returning success')
    return {success: true}
}
