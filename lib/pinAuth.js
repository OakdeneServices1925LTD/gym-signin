// Single place that talks to the PIN edge function.
// The raw PIN leaves the phone over https and is never stored anywhere on it.
export async function pinAuth(body) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/pin-auth';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Something went wrong. Try again.' };
    return data;
  } catch {
    return { error: 'No connection. Check your signal and try again.' };
  }
}
