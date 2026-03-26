"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, ChevronDown } from "lucide-react";
import { buildWALink } from "@/lib/meta";

interface Props {
  phone: string;
  name: string;
  template: string;
  templateEs: string;
  size?: "sm" | "default";
}

export function WhatsAppButton({ phone, name, template, templateEs, size = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!phone) return null;

  const send = (tmpl: string) => {
    window.open(buildWALink(phone, tmpl, name), "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  if (size === "sm") {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          title={`WhatsApp ${name}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-9 z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[130px]">
            <button
              onClick={() => send(template)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => send(templateEs)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
            >
              🇪🇸 Spanish
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => send(template)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-l-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp
      </button>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-2 rounded-r-lg bg-green-500 hover:bg-green-600 text-white border-l border-green-400 transition-colors"
        title="Choose language"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[140px]">
          <button
            onClick={() => send(template)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            🇬🇧 English
          </button>
          <button
            onClick={() => send(templateEs)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            🇪🇸 Spanish
          </button>
        </div>
      )}
    </div>
  );
}
