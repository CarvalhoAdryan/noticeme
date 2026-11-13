export function warmUpApi(): void {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    return;
  }

  const normalizedUrl = apiUrl.replace(/\/+$/, '');

  void fetch(`${normalizedUrl}/health`).catch(() => {
    // Ignora silenciosamente erros de rede no warm-up inicial
  });
}
