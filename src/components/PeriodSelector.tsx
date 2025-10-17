// src/components/PeriodSelector.tsx
import React, { useEffect, useMemo, useState } from "react";

interface PeriodSelectorProps {
  /**
   * Called when the user submits a valid period.
   * Emits ISO date strings in the form "YYYY-MM-DD".
   */
  onSubmit: (range: { start: string; end: string }) => void;

  /**
   * Optional initial values (ISO "YYYY-MM-DD"). If not provided the component
   * will default to (today - 30 days) .. today.
   */
  initialStartIso?: string;
  initialEndIso?: string;

  /**
   * Optional year bounds for the select lists.
   * Defaults to [currentYear - 5, currentYear + 1].
   */
  minYear?: number;
  maxYear?: number;
}

/**
 * PeriodSelector
 *
 * Controlled React component that renders selects for initial and final
 * day/month/year, validates the period on submit and emits a normalized
 * ISO date range ("YYYY-MM-DD") via onSubmit prop.
 *
 * Notes & decisions:
 * - We accept optional initial ISO dates to allow integration with saved state.
 * - We validate calendar correctness (e.g. Feb 29 only on leap years) by creating a
 *   Date and comparing components. This avoids ad-hoc month/day maps.
 * - When a change causes an invalid day for the selected month/year (e.g. switching
 *   to February while day is 31), we clamp the day to the month's max to avoid
 *   surprising invalid states for users.
 * - We keep the UI minimal and accessible; Tailwind classes are used for basic layout.
 * - TODO: (REVIEW) Consider adding keyboard shortcuts or localization for month names.
 */
export default function PeriodSelector({
  onSubmit,
  initialStartIso,
  initialEndIso,
  minYear,
  maxYear,
}: PeriodSelectorProps) {
  // Compute default years range
  const currentYear = new Date().getFullYear();
  const yearMin = minYear ?? currentYear - 5;
  const yearMax = maxYear ?? currentYear + 1;

  // Utility: parse ISO YYYY-MM-DD to components
  const parseIso = (iso?: string) => {
    if (!iso) return null;
    const parts = iso.split("-");
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
    return { year: y, month: m, day: d };
  };

  // Defaults: today and 30 days before
  const today = new Date();
  const defaultEnd = parseIso(initialEndIso) ?? {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
  const thirtyDaysBefore = new Date();
  thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);
  const defaultStart = parseIso(initialStartIso) ?? {
    year: thirtyDaysBefore.getFullYear(),
    month: thirtyDaysBefore.getMonth() + 1,
    day: thirtyDaysBefore.getDate(),
  };

  // Controlled state for initial (start) and final (end) date components
  const [startYear, setStartYear] = useState<number>(defaultStart.year);
  const [startMonth, setStartMonth] = useState<number>(defaultStart.month);
  const [startDay, setStartDay] = useState<number>(defaultStart.day);

  const [endYear, setEndYear] = useState<number>(defaultEnd.year);
  const [endMonth, setEndMonth] = useState<number>(defaultEnd.month);
  const [endDay, setEndDay] = useState<number>(defaultEnd.day);

  const [error, setError] = useState<string | null>(null);

  // Month labels (simple English names). TODO: (REVIEW) Localize if app requires i18n.
  const months = useMemo(
    () => [
      { value: 1, label: "Jan" },
      { value: 2, label: "Feb" },
      { value: 3, label: "Mar" },
      { value: 4, label: "Apr" },
      { value: 5, label: "May" },
      { value: 6, label: "Jun" },
      { value: 7, label: "Jul" },
      { value: 8, label: "Aug" },
      { value: 9, label: "Sep" },
      { value: 10, label: "Oct" },
      { value: 11, label: "Nov" },
      { value: 12, label: "Dec" },
    ],
    []
  );

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = yearMax; y >= yearMin; y--) arr.push(y);
    return arr;
  }, [yearMin, yearMax]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= 31; d++) arr.push(d);
    return arr;
  }, []);

  // Helper: check valid calendar date
  const isValidDate = (y: number, m: number, d: number) => {
    if (m < 1 || m > 12) return false;
    if (d < 1) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
  };

  const daysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate(); // day 0 of next month => last day of m
  };

  // When month/year changes, clamp day to the valid range for that month to avoid invalid states.
  useEffect(() => {
    const maxDay = daysInMonth(startYear, startMonth);
    if (startDay > maxDay) setStartDay(maxDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startYear, startMonth]);

  useEffect(() => {
    const maxDay = daysInMonth(endYear, endMonth);
    if (endDay > maxDay) setEndDay(maxDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endYear, endMonth]);

  // Utility to pad numbers to two digits
  const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

  const toIso = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

  // Submission handler: validate and emit
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // Validate individual dates
    if (!isValidDate(startYear, startMonth, startDay)) {
      setError("Data inicial inválida. Verifique dia/mês/ano.");
      return;
    }
    if (!isValidDate(endYear, endMonth, endDay)) {
      setError("Data final inválida. Verifique dia/mês/ano.");
      return;
    }

    const startIso = toIso(startYear, startMonth, startDay);
    const endIso = toIso(endYear, endMonth, endDay);

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    if (startDate.getTime() > endDate.getTime()) {
      setError("O período inicial não pode ser posterior ao período final.");
      return;
    }

    // Success: emit normalized ISO date range
    onSubmit({ start: startIso, end: endIso });
  };

  // Small helper to render select groups to reduce duplication
  const SelectGroup: React.FC<{
    label: string;
    day: number;
    month: number;
    year: number;
    onDay: (v: number) => void;
    onMonth: (v: number) => void;
    onYear: (v: number) => void;
  }> = ({ label, day, month, year, onDay, onMonth, onYear }) => {
    const maxDay = daysInMonth(year, month);
    return (
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-2 items-center">
          <select
            aria-label={`${label} dia`}
            className="px-2 py-1 border rounded bg-white text-sm"
            value={day}
            onChange={(ev) => onDay(Number(ev.target.value))}
          >
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            aria-label={`${label} mês`}
            className="px-2 py-1 border rounded bg-white text-sm"
            value={month}
            onChange={(ev) => onMonth(Number(ev.target.value))}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            aria-label={`${label} ano`}
            className="px-2 py-1 border rounded bg-white text-sm"
            value={year}
            onChange={(ev) => onYear(Number(ev.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="max-w-md w-full bg-slate-50 p-4 rounded shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4">
        <SelectGroup
          label="Período inicial"
          day={startDay}
          month={startMonth}
          year={startYear}
          onDay={(v) => setStartDay(v)}
          onMonth={(v) => setStartMonth(v)}
          onYear={(v) => setStartYear(v)}
        />

        <SelectGroup
          label="Período final"
          day={endDay}
          month={endMonth}
          year={endYear}
          onDay={(v) => setEndDay(v)}
          onMonth={(v) => setEndMonth(v)}
          onYear={(v) => setEndYear(v)}
        />

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="flex gap-2 justify-center">
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Consultar
          </button>
          <button
            type="button"
            onClick={() => {
              // Reset to defaults (initial props or computed defaults)
              const s = defaultStart;
              const e = defaultEnd;
              setStartYear(s.year);
              setStartMonth(s.month);
              setStartDay(s.day);
              setEndYear(e.year);
              setEndMonth(e.month);
              setEndDay(e.day);
              setError(null);
            }}
            className="px-4 py-2 border rounded bg-white hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
