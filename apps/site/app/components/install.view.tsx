// import consts
import { RELEASES_URL } from "../lib/site.consts.ts";

interface InstallProps {
  /** The latest release's version, without the v. */
  version: string;
  /** Its release page. */
  releaseUrl: string;
}

const cardClass = "flex min-w-0 flex-col rounded-2xl border-2 border-ink bg-white p-6";
/** The command never clips: it wraps only at the space before the file name. */
const codeClass = "mt-3 block rounded-lg bg-ink px-3 py-2.5 text-[13px] text-cream";

/** Where to get Toucan: the stores are coming (website/0013), the GitHub release is here now. */
export function Install({ version, releaseUrl }: InstallProps) {
  return (
    <div className="grid gap-[18px] lg:grid-cols-3">
      <div className={cardClass}>
        <h3 className="text-xl font-bold">GitHub release</h3>
        <p className="mt-1 text-muted">
          Download the .vsix from the{" "}
          <a href={releaseUrl} className="font-semibold underline decoration-amber decoration-2">
            {version} release
          </a>
          , then install it from file.
        </p>
        <code className={codeClass}>
          <span className="whitespace-nowrap">code --install-extension</span>{" "}
          <span className="whitespace-nowrap">toucan-{version}.vsix</span>
        </code>
      </div>
      <div className={`${cardClass} opacity-70`}>
        <h3 className="text-xl font-bold">Visual Studio Marketplace</h3>
        <p className="mt-1 text-muted">For VS Code. Coming soon.</p>
      </div>
      <div className={`${cardClass} opacity-70`}>
        <h3 className="text-xl font-bold">Open VSX</h3>
        <p className="mt-1 text-muted">For Cursor, VSCodium and Windsurf. Coming soon.</p>
      </div>
      <p className="text-sm text-muted lg:col-span-3">
        Older versions are on the{" "}
        <a href={RELEASES_URL} className="font-semibold underline decoration-amber decoration-2">
          releases page
        </a>
        .
      </p>
    </div>
  );
}
