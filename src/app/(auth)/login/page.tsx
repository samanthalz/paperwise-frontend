'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import InputField from '@/components/input-field';
import SocialLoginButtons from '@/components/social-login-btn';
import Link from 'next/link';
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [redirect, setRedirect] = useState('/dashboard');
    const [searchParamsReady, setSearchParamsReady] = useState(false);

    const router = useRouter();
    const supabase = createClientComponentClient();

    // Lazy read search params in effect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setRedirect(params.get('redirect') || '/dashboard');
        setSearchParamsReady(true);
    }, []);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const {error} = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMsg('Incorrect email or password. Please try again.');
            return;
        }

        router.push(redirect);
    };

    // Prevent rendering until searchParams are ready (avoids SSR issue)
    if (!searchParamsReady) return null;

    return (
        <div className="flex h-screen">
            {/* Left side */}
            <div className="w-1/2 flex flex-col justify-center items-center px-16">
                <div className="w-full max-w-md">
                    <h2 className="text-3xl font-semibold mb-2">Login</h2>
                    <p className="mb-8 text-sm">
                        If you don’t have an account, you can{' '}
                        <Link
                            href={`/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                            className="text-blue-600 font-semibold"
                        >
                            Register Here!
                        </Link>
                    </p>

                    <form className="space-y-8" onSubmit={handleLogin}>
                        <InputField
                            label="Email"
                            type="email"
                            placeholder="Enter your email address"
                            icon="email"
                            name="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className="relative">
                            <InputField
                                label="Password"
                                type="password"
                                placeholder="Enter your password"
                                icon="lock"
                                name="password"
                                isPassword
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            {errorMsg && (
                                <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>
                            )}

                            <div className="flex justify-end mt-2 text-sm">
                                <Link href="/forgot-password" className="text-blue-600 hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 rounded-full text-lg mt-2"
                        >
                            Login
                        </button>
                    </form>

                    <div className="my-6 text-center text-sm text-gray-500">
                        or continue with
                    </div>

                    <SocialLoginButtons/>
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
    );
}
