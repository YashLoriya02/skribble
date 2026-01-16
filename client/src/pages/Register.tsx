import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

type RegisterResponse = { message?: string };

export default function Register() {
    const nav = useNavigate();
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [err, setErr] = useState<string>("");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        setLoading(true);

        try {
            await api.post<RegisterResponse>("/auth/register", { name, email, password });
            nav("/login");
        } catch (e2: any) {
            setErr(e2?.response?.data?.message || "Register failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-md">
            <h1 className="text-2xl font-semibold">Register</h1>
            <p className="mt-1 text-sm text-zinc-400">
                Already have an account?{" "}
                <Link className="text-white underline" to="/login">
                    Login
                </Link>
            </p>

            <form
                onSubmit={onSubmit}
                className="mt-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5"
            >
                <div>
                    <label className="text-sm text-zinc-300">Name</label>
                    <input
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-500"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="text-sm text-zinc-300">Email</label>
                    <input
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        required
                    />
                </div>

                <div>
                    <label className="text-sm text-zinc-300">Password</label>
                    <input
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        required
                    />
                </div>

                {err && (
                    <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                        {err}
                    </div>
                )}

                <button
                    disabled={loading}
                    className="w-full rounded-xl bg-white px-4 py-2 font-medium text-zinc-900 hover:opacity-90 disabled:opacity-60"
                >
                    {loading ? "Creating..." : "Create account"}
                </button>
            </form>
        </div>
    );
}
