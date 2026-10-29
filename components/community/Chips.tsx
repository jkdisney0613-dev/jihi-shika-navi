"use client";

// 投稿フォームの「押して選ぶ」ボタン群
export default function Chips<T extends string | number>({ label, options, value, onChange, required }: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-bold">{label}{required && <span className="ml-1 text-[#B4471C]">必須</span>}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-10 rounded-full border-2 px-3.5 text-sm font-bold transition ${
              value === o.value ? "border-[#3F6E1E] bg-[#3F6E1E] text-white" : "border-[#E2D6C2] bg-white text-[#4A3B2C] hover:border-[#7AB648]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
