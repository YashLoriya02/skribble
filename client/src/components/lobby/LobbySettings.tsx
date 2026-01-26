import {useMemo, useState} from "react";
import {socket} from "../../socket/socket";
import {useGameStore} from "../../store/useGameStore";
import CustomSelect from "./CustomSelect.tsx";
import {Input} from "../ui/input.tsx";

export default function LobbySettings() {
    const [players, setPlayers] = useState(2);
    const {publicState, roomCode, playerId} = useGameStore();

    const isHost = useMemo(
        () => publicState?.hostPlayerId === playerId,
        [publicState, playerId]
    );

    if (!publicState || publicState.phase !== "lobby" || !isHost) return null;

    const rounds = publicState.settings.maxRounds;
    const drawTime = publicState.settings.roundDurationSec;

    const update = (settings: Partial<{ maxRounds: number; roundDurationSec: number; maxPlayers: number }>) => {
        if (!roomCode || !playerId) return;
        socket.emit("room:updateSettings", {roomCode, playerId, settings});
    };

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm text-zinc-200 font-semibold mb-3">Host Controls</div>

            <div className="grid gap-3 md:grid-cols-3">
                {/* Max Players */}
                <div className="space-y-1.5">
                    <div className="text-xs text-zinc-400">Max Players</div>
                    <Input
                        value={players}
                        type={"number"}
                        min={0}
                        max={12}
                        onChange={(e) => {
                            setPlayers(Number(e.target.value))
                            update({maxPlayers: Number(e.target.value)})
                        }}
                        placeholder=""
                        className="bg-zinc-950/40 text-white/90 appearance-none border-zinc-800"
                    />
                </div>

                {/* Rounds */}
                <div className="space-y-1.5">
                    <div className="text-xs text-zinc-400">Rounds</div>
                    <CustomSelect
                        value={rounds}
                        onChange={(v) => update({maxRounds: v})}
                        options={[1, 3, 5, 7].map((v) => ({value: v, label: String(v)}))}
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="text-xs text-zinc-400">Draw time (sec)</div>
                    <CustomSelect
                        value={drawTime}
                        onChange={(v) => update({roundDurationSec: v})}
                        options={[60, 80, 100].map((v) => ({value: v, label: `${v} sec`}))}
                    />

                </div>
            </div>

            <div className="mt-2 tracking-wide text-xs text-right text-red-400/70">
                (Settings will be changed only for this lobby)
            </div>
        </div>
    );
}
