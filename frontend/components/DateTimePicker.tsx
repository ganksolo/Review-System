/**
 * DateTimePicker — calendar popup + time input, replacing native datetime-local.
 *
 * Design system: Dark OLED theme, consistent with existing form-input styling.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid, startOfToday } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar, X } from "lucide-react";

interface Props {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function DateTimePicker({
    value,
    onChange,
    placeholder = "选择日期时间",
    className = "",
}: Props) {
    const [open, setOpen] = useState(false);
    const [time, setTime] = useState("09:30");
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedDate = value ? parse(value.slice(0, 10), "yyyy-MM-dd", new Date()) : undefined;

    useEffect(() => {
        if (value && value.length >= 16) {
            setTime(value.slice(11, 16));
        }
    }, [value]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleDaySelect = useCallback((day: Date | undefined) => {
        if (!day) {
            return;
        }
        const dateStr = format(day, "yyyy-MM-dd");
        onChange(`${dateStr}T${time}`);
        setOpen(false);
    }, [time, onChange]);

    const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        setTime(newTime);
        if (selectedDate && isValid(selectedDate)) {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            onChange(`${dateStr}T${newTime}`);
        }
    }, [selectedDate, onChange]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setTime("09:30");
    }, [onChange]);

    const displayValue = selectedDate && isValid(selectedDate)
        ? `${format(selectedDate, "yyyy-MM-dd")} ${time}`
        : "";

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div
                onClick={() => setOpen(!open)}
                className="form-input flex cursor-pointer items-center gap-2"
            >
                <Calendar className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                <span className={displayValue ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
                    {displayValue || placeholder}
                </span>
                {displayValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="ml-auto shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {open && (
                <div
                    className="absolute left-0 top-full z-50 mt-1 rounded-xl border shadow-2xl"
                    style={{
                        backgroundColor: "var(--color-bg-surface)",
                        borderColor: "var(--color-border)",
                    }}
                >
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDaySelect}
                        defaultMonth={selectedDate || startOfToday()}
                        locale={zhCN}
                        showOutsideDays
                    />
                    <div
                        className="flex items-center gap-2 border-t px-4 py-3"
                        style={{ borderColor: "var(--color-border)" }}
                    >
                        <span className="text-xs text-[var(--color-text-muted)]">时间</span>
                        <input
                            type="time"
                            value={time}
                            onChange={handleTimeChange}
                            className="form-input flex-1 text-center font-mono text-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
