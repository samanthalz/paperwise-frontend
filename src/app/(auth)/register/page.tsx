'use client'

import {useRouter} from 'next/navigation'
import React, {startTransition, useEffect} from 'react'
import {registerUser} from './actions'
import InputField from '@/components/input-field'
import Image from 'next/image'
import Link from "next/link"

const initialState = {
    error: undefined,
    success: false,
}

export default function RegisterPage() {
    const router = useRouter()
    const [state, formAction, isPending] = React.useActionState(registerUser, initialState)
    const [clientError, setClientError] = React.useState<string | undefined>()

    // Redirect after success
    useEffect(() => {
        if (state.success) {
            const timeout = setTimeout(() => {
                router.replace('/login');
            }, 4000); // Give user 4s to read message
            return () => clearTimeout(timeout);
        }
    }, [state.success, router]);

    // Handle form submission with client-side validation
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setClientError(undefined)

        const form = e.currentTarget
        const formData = new FormData(form)
        const fullName = formData.get('fullName') as string
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        // Full name validation
        if (!fullName || fullName.trim().length < 3) {
            setClientError('Please enter your full name.')
            return
        }

        // Only valid name characters
        const nameRegex = /^[A-Za-zÀ-ÿ ]+$/
        if (!nameRegex.test(fullName)) {
            setClientError('Full name can only contain letters and spaces.')
            return
        }

        // Password match
        if (password !== confirmPassword) {
            setClientError('Passwords do not match.')
            return
        }

        // Password strength
        const passwordRegex =
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+=\-{};:'",.<>/?]{8,}$/
        if (!passwordRegex.test(password)) {
            setClientError(
                'Password must be at least 8 characters long and contain at least one letter and one number.'
            )
            return
        }

        // Email existence pre-check
        try {
            const res = await fetch('/api/check-email', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email}),
            })

            const data = await res.json()
            if (data.exists) {
                setClientError('This email is already registered.')
                return
            }
        } catch (err) {
            console.error('Email check failed:', err)
            setClientError('Unable to verify email. Please try again.')
            return
        }

        // Everything passed — run the server action
        startTransition(() => {
            formAction(formData)
        })
    }

    // UI
    if (isPending) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-base font-medium text-gray-600">Registering your account...</p>
                </div>
            </div>
        )
    }

    if (state.success) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                    <div
                        className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-base font-medium text-gray-700">
                        Registration successful!
                    </p>
                    <p className="text-sm text-gray-500">
                        A verification link has been sent to your email.
                        <br/>
                        Please verify before logging in.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                        You’ll be redirected to the login page shortly…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen">
            {/* Left side */}
            <div className="w-1/2 flex flex-col justify-center items-center px-16">
                <div className="w-full max-w-md">
                    <h2 className="text-3xl font-semibold mb-2">Register</h2>
                    <p className="mb-8 text-sm">
                        If you already have an account, you can{' '}
                        <Link href="/login" className="text-blue-600 font-semibold">
                            Login Here!
                        </Link>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <InputField
                            label="Full Name"
                            type="text"
                            placeholder="Enter your full name"
                            icon="user"
                            name="fullName"
                            required
                        />
                        <InputField
                            label="Email"
                            type="email"
                            placeholder="Enter your email address"
                            icon="email"
                            name="email"
                            required
                        />
                        <InputField
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            icon="lock"
                            name="password"
                            isPassword
                            required
                        />
                        <InputField
                            label="Confirm Password"
                            type="password"
                            placeholder="Re-enter your password"
                            icon="lock"
                            name="confirmPassword"
                            isPassword
                            required
                        />

                        {/* Show client-side error first, fallback to server error */}
                        {(clientError || state.error) && (
                            <div className="text-sm text-red-600 -mt-4">
                                ⚠️ {clientError || state.error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 rounded-full text-lg mt-4"
                        >
                            Register
                        </button>
                    </form>
                </div>
            </div>

            {/* Right side */}
            <div className="w-1/2 relative bg-white flex items-center justify-center overflow-hidden">
                <Image
                    src="/images/login-bg.png"
                    alt="Paper stack"
                    width={1792}
                    height={2560}
                    className="w-auto h-auto"
                    priority
                />
                <div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 border px-6 py-2 rounded-xl text-white border-white z-10">
                    PaperWise
                </div>
            </div>
        </div>
    )
}
