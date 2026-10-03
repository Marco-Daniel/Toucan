// import utils
import { scopeSvgIds, sizedSvg } from "../lib/svg.util.ts";

// import views
import { BuildMarkup } from "./buildMarkup.view.tsx";

// import consts
import LOGO_SVG from "@toucan/brand/assets/logo.svg?raw";

interface LogoProps {
  /** Unique per logo on the page: the logo's mask ids are prefixed with it. */
  id: string;
  className: string;
}

/** The bird alone, from the brand's logo. */
export function Logo({ id, className }: LogoProps) {
  return (
    <BuildMarkup
      className="inline-flex"
      html={sizedSvg({ svg: scopeSvgIds({ svg: LOGO_SVG, prefix: id }), className })}
    />
  );
}
