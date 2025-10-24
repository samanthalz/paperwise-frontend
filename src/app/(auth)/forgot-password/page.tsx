'use client'

import {useState} from 'react'
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs'
import {useRouter} from 'next/navigation'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const supabase = createClientComponentClient()
    const router = useRouter()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)

        const {error} = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/reset-password`, // page user will go to after clicking email link
        })

        setLoading(false)

        if (error) {
            setError(error.message)
            return
        }

        setMessage('We’ve sent a password reset link to your email.')
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
                <h2 className="text-2xl font-semibold mb-6 text-center">Forgot Password</h2>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-full hover:bg-blue-700 transition"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="text-center mt-6 text-sm">
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
