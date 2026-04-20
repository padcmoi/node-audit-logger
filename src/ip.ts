import type { HeaderValue, HttpRequestLike } from "./types";

function readHeaderValue(value: HeaderValue) {
  if (typeof value === "string") return value;
  if (value === undefined) return "";

  const first = value.at(0);
  if (typeof first === "string") return first;

  return "";
}

export function resolveRemoteIpFromRequest(request: HttpRequestLike) {
  const forwardedHeader = request.headers?.["x-forwarded-for"];
  const realIpHeader = request.headers?.["x-real-ip"];

  const fromForwarded = readHeaderValue(forwardedHeader).split(",")[0]?.trim() ?? "";
  const fromRealIp = readHeaderValue(realIpHeader).trim();
  const fromSocket = request.socket?.remoteAddress ?? "";

  let remoteAddress = fromForwarded || fromRealIp || fromSocket || "";

  if (remoteAddress.startsWith("::ffff:")) {
    remoteAddress = remoteAddress.slice("::ffff:".length);
  }

  if (remoteAddress === "::1" || remoteAddress === "0:0:0:0:0:0:0:1") {
    remoteAddress = "127.0.0.1";
  }

  return remoteAddress;
}
