import handler from "../api/trpc/[trpc].ts";

const url =
  "http://localhost/api/trpc/auto1.dashboard?input=" +
  encodeURIComponent(JSON.stringify({ json: null, meta: { values: ["undefined"] } }));
const req = new Request(url);
const res = await handler(req);
const text = await res.text();
console.log("STATUS:", res.status);
console.log("BODY:", text.substring(0, 600));
