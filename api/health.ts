export function GET(): Response {
    return Response.json({
        ok: true,
        service: "big-two",
        ns: process.env.DATA_NAMESPACE ?? "dev",
    });
}
