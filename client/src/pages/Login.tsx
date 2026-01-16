import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

type LoginResponse = {
    token?: string;
    message?: string;
};

export default function Login() {
    const nav = useNavigate();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [err, setErr] = useState<string>("");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        setLoading(true);

        try {
            // adjust endpoint names to your backend
            const res = await api.post<LoginResponse>("/auth/login", { email, password });

            if (res.data?.token) localStorage.setItem("skribble_token", res.data.token);

            nav("/dashboard");
        } catch (e2: any) {
            setErr(e2?.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-md">
            <h1 className="text-2xl font-semibold">Login</h1>
            <p className="mt-1 text-sm text-zinc-400">
                Don’t have an account?{" "}
                <Link className="text-white underline" to="/register">
                    Register
                </Link>
            </p>

            <form
                onSubmit={onSubmit}
                className="mt-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5"
            >
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
                    {loading ? "Signing in..." : "Login"}
                </button>
            </form>
        </div>
    );
}
