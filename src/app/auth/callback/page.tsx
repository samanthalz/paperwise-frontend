'use client'

import {useEffect} from 'react'
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs'
import {useRouter} from 'next/navigation'

export default function AuthCallback() {
    const supabase = createClientComponentClient()
    const router = useRouter()

    useEffect(() => {
        const handleAuth = async () => {
            // Get search params inside the effect
            const params = new URLSearchParams(window.location.search)
            const redirectTo = params.get('redirectTo')

            const {data: {session}, error} = await supabase.auth.getSession()

            if (error) {
                console.error('Failed to get session:', error.message)
                router.replace('/login')
                return
            }

            if (session) {
                console.log('Session available, inserting user...')

                const {data: {user}, error: userError} = await supabase.auth.getUser()
                if (userError) {
                    console.error('Failed to fetch user:', userError.message)
                    router.replace('/login')
                    return
                }

                if (user) {
                    const {error: dbError} = await supabase.from('users').upsert(
                        {
                            id: user.id,
                            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
                        },
                        {onConflict: 'id'}
                    )

                    if (dbError) {
                        console.error('Failed to insert user:', dbError.message)
                    }
                }

                router.replace(redirectTo || '/dashboard')
            } else {
                console.log('No session, redirecting to /login')
                router.replace('/login')
            }
        }

        handleAuth()
    }, [router, supabase])

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="animate-pulse text-lg font-medium">Finishing login...</p>
        </div>
    )
}
