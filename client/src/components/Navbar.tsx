import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
    const nav = useNavigate();
    const token = localStorage.getItem("skribble_token");

    const logout = () => {
        localStorage.removeItem("skribble_token");
        nav("/login");
    };

    return (
        <div className="border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <Link to="/dashboard" className="font-semibold tracking-tight">
                    Skribble
                </Link>

                <div className="flex items-center gap-3">
                    {!token ? (
                        <>
                            <Link className="text-zinc-300 hover:text-white" to="/login">
                                Login
                            </Link>
                            <Link
                                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                                to="/register"
                            >
                                Register
                            </Link>
                        </>
                    ) : (
                        <button
                            onClick={logout}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
