import {useState} from "react";
import {SFX} from "../audio/sound.ts";
import {Volume2, VolumeOff} from "lucide-react";

export function SoundToggle() {
    const [muted, setMuted] = useState(false);

    return (
        <button
            className="px-2 py-2 rounded-md border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/50"
            onClick={() => {
                const next = !muted;
                setMuted(next);
                SFX.setMuted(next);
            }}
        >
            {muted ?  <VolumeOff className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
        </button>
    );
}
