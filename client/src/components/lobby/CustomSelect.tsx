import {useEffect, useRef, useState} from "react";
import {ChevronDown} from "lucide-react";

type Option = {
    label: string;
    value: number;
    disabled?: boolean;
};

type Props = {
    value: number;
    options: Option[];
    onChange: (v: number) => void;
};

export default function CustomSelect({value, options, onChange}: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const selected = options.find((o) => o.value === value);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((s) => !s)}
                className="w-full flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800/50 transition"
            >
                <span>{selected?.label ?? value}</span>
                <ChevronDown
                    className={`h-4 w-4 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div
                    className="absolute z-50 mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            disabled={opt.disabled}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition 
                ${opt.disabled
                                ? "text-zinc-500 cursor-not-allowed"
                                : "text-zinc-200 hover:bg-zinc-800/60"
                            }
                ${opt.value === value ? "bg-zinc-800/60" : ""}
              `}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
