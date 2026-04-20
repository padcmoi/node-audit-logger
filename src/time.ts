export const dateNowMs = () => Date.now();

export const dateISO = (timestampMs = dateNowMs()) => new Date(timestampMs).toISOString();
