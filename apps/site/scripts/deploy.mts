// `pnpm -C apps/site deploy:netlify`, from the deploy workflow only: deploys
// build/client to the Netlify site NETLIFY_SITE_ID with NETLIFY_AUTH_TOKEN,
// which only the `production` environment holds (website/0010). Its logic is in
// scripts/netlify.mts, which the tests import; nothing imports this file.
// import utils
import { errorText, tryCatch } from "../../extension/src/shared/async/tryCatch.util.ts";
import { deploy, listFiles, netlifyApi, redact } from "./netlify.mts";

const BUILD = new URL("../build/client/", import.meta.url).pathname;

const token = process.env["NETLIFY_AUTH_TOKEN"] ?? "";
const siteId = process.env["NETLIFY_SITE_ID"] ?? "";

if (token === "" || siteId === "") {
  console.error("NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must both be set.");
  process.exit(1);
}

const [status, error] = await tryCatch(() =>
  deploy({ files: listFiles(BUILD), netlify: netlifyApi({ token, siteId }) }),
);
if (error !== null) {
  console.error(redact({ text: errorText(error), token }));
  process.exit(1);
}
console.log(`Deploy ${status.id} is live.`);
