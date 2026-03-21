function safeUrlParts(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port || null,
      pathname: parsed.pathname,
    };
  } catch {
    return {
      protocol: 'unknown',
      host: 'unknown',
      port: null,
      pathname: '',
    };
  }
}

export function startupError(service, rawUrl, error) {
  const parts = safeUrlParts(rawUrl);
  const location = [parts.host, parts.port].filter(Boolean).join(':');
  const detail = location || rawUrl;
  const wrapped = new Error(
    `${service} connection failed at ${detail}. Start ${service} locally or update the corresponding URL in .env.`,
    { cause: error },
  );

  wrapped.service = service;
  wrapped.code = error?.code ?? null;
  wrapped.location = detail;
  return wrapped;
}

export function startupSummary(error) {
  return {
    service: error?.service ?? null,
    code: error?.code ?? error?.cause?.code ?? null,
    location: error?.location ?? null,
    message: error?.message ?? 'Unknown startup failure',
    cause: error?.cause?.message ?? null,
  };
}
