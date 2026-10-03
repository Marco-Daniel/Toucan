// import consts
import { BRAND_PRESETS } from "@toucan/brand/presets.consts.ts";

/** The 16 presets, each as a swatch with its name and hex. */
export function Palette() {
  return (
    <ul className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-4 lg:grid-cols-8">
      {BRAND_PRESETS.map(({ name, hex }) => (
        <li key={name} className="flex flex-col gap-1 text-xs">
          <span
            className="block aspect-square rounded-xl border-2 border-ink"
            style={{ background: hex }}
          />
          <b className="text-[13px]">{name}</b>
          <code className="text-muted">{hex}</code>
        </li>
      ))}
    </ul>
  );
}
