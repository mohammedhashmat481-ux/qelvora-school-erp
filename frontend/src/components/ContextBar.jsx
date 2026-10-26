import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";

export const DEFAULT_CONTEXT = {
  standard: "10th",
  subject: "Mathematics",
  syllabus: "CBSE",
  difficulty: "Medium",
  language: "English",
};

export function useOptions() {
  const [opts, setOpts] = useState(null);
  useEffect(() => {
    api.get("/options")
      .then((r) => setOpts(r.data))
      .catch((err) => console.error("Failed to load options", err));
  }, []);
  return opts;
}

function Field({ label, value, onChange, options, testid, disabled }) {
  const activeOptions = [...(options || [])];
  if (value && !activeOptions.includes(value)) {
    activeOptions.unshift(value);
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={testid}
        className="w-full rounded-md border border-slate-300 bg-white px-3 h-10 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {activeOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ContextBar({ ctx, setCtx, opts, extra }) {
  const location = useLocation();
  const hasStoredBoard = !!localStorage.getItem("school_board") || !!(new URLSearchParams(location.search).get("board"));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlBoard = params.get("board");
    if (urlBoard) {
      localStorage.setItem("school_board", urlBoard);
    }

    const storedBoard = localStorage.getItem("school_board");
    if (storedBoard && ctx.syllabus !== storedBoard) {
      setCtx((prev) => ({ ...prev, syllabus: storedBoard }));
    }
  }, [ctx.syllabus, setCtx, location.search]);

  if (!opts) {
    return (
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-medium text-slate-500 animate-pulse">
        Loading curriculum parameters...
      </div>
    );
  }
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Field
          label="Standard"
          value={ctx.standard}
          onChange={(v) => setCtx({ ...ctx, standard: v })}
          options={opts.standards}
          testid="ctx-standard"
        />
        <Field
          label="Subject"
          value={ctx.subject}
          onChange={(v) => setCtx({ ...ctx, subject: v })}
          options={opts.subjects}
          testid="ctx-subject"
        />
        <Field
          label="Syllabus"
          value={ctx.syllabus}
          onChange={(v) => setCtx({ ...ctx, syllabus: v })}
          options={opts.syllabuses}
          testid="ctx-syllabus"
          disabled={hasStoredBoard}
        />
        <Field
          label="Difficulty"
          value={ctx.difficulty}
          onChange={(v) => setCtx({ ...ctx, difficulty: v })}
          options={opts.difficulties}
          testid="ctx-difficulty"
        />
        <Field
          label="Language"
          value={ctx.language}
          onChange={(v) => setCtx({ ...ctx, language: v })}
          options={opts.languages}
          testid="ctx-language"
        />
      </div>
      {extra && <div className="mt-4">{extra}</div>}
    </div>
  );
}
