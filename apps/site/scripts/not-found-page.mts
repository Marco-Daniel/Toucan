// Runs after `react-router build`: copies the pre-rendered /404 page to
// build/client/404.html, the page Netlify serves, with a 404 status, for any
// path the site doesn't have.
// import libraries
import { copyFileSync } from "node:fs";

const CLIENT = new URL("../build/client/", import.meta.url);

copyFileSync(new URL("404/index.html", CLIENT), new URL("404.html", CLIENT));
console.log("build/client/404.html: the not-found page");
