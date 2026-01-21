import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import {bindSocketOnce} from "./socket/bindSocket.ts";
import Lobby from "./pages/Lobby.tsx";
import Game from "./pages/Game.tsx";
import Home from "./pages/Home.tsx";

export default function App() {
    useEffect(() => {
        bindSocketOnce();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/lobby" element={<Lobby />} />
                <Route path="/game" element={<Game />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}
