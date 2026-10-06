import { createFileRoute } from "@tanstack/react-router";

// Encaminha /api/v1/* para o Django. Se o backend estiver fora, responde 503 limpo.
async function forward({ request, params }: { request: Request; params: { _splat?: string } }) {
  const backend = (process.env["BACKEND_URL"] ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const url = new URL(request.url);
  let path = params._splat ?? "";
  if (path && !path.endsWith("/")) path += "/"; // Django exige barra final
  const target = `${backend}/api/v1/${path}${url.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  try {
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const res = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
    return new Response(res.body, { status: res.status, headers: res.headers });
  } catch (err) {
    console.warn("[api proxy] backend indisponível:", (err as Error).message);
    return Response.json({ detail: "Backend indisponível" }, { status: 424, headers: { "X-Backend-Offline": "1" } });
  }
}

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: { GET: forward, POST: forward, PUT: forward, PATCH: forward, DELETE: forward },
  },
});
