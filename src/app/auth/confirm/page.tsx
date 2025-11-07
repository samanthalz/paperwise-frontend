'use client'

import {useEffect, useState} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs'

export default function EmailConfirmPage() {
    const supabase = createClientComponentClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

    useEffect(() => {
        const verifyEmail = async () => {
            const token_hash = searchParams.get('token_hash')
            const type = searchParams.get('type')

            if (!token_hash || type !== 'email') {
                setStatus('error')
                return
            }

            // Verify the OTP token
            const {error} = await supabase.auth.verifyOtp({type: 'email', token_hash})

            if (error) {
                console.error('Email verification failed:', error)
                setStatus('error')
                return
            }

            const {data: {session}} = await supabase.auth.getSession()

            if (session) {
                // Insert or update user record
                const {data: {user}} = await supabase.auth.getUser()

                if (user) {
                    await supabase.from('users').upsert(
                        {
                            id: user.id,
                            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
                        },
                        {onConflict: 'id'}
                    )
                }
            }

            setStatus('success')

            // Redirect after short delay
            setTimeout(() => router.replace('/login'), 2500)
        }

        verifyEmail()
    }, [searchParams, router, supabase])

    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            {status === 'loading' && (
                <p className="text-gray-600 text-lg">Verifying your email...</p>
            )}
            {status === 'success' && (
                <p className="text-green-600 text-lg">Email verified! Redirecting to login...</p>
            )}
            {status === 'error' && (
                <p className="text-red-600 text-lg">Invalid or expired verification link.</p>
            )}
        </div>
    )
}
