export function track(event: string, payload: Record<string, unknown> = {}): void {
  console.info('[telemetry]', event, payload);
}
