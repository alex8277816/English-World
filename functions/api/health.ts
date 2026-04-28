export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ status: "ok", runtime: "cloudflare-workers" }), {
    headers: { "Content-Type": "application/json" }
  });
};
