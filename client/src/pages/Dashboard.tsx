export default function Dashboard() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Dashboard</h1>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
                <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-400">
                    <li>Create / Join Room UI</li>
                    <li>Canvas drawing board</li>
                    <li>Socket events integration</li>
                    <li>Chat guessing + scoreboard</li>
                </ul>
            </div>
        </div>
    );
}
