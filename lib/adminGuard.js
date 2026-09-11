import { getMember } from '@/lib/supabase/server';

// Route handlers check this themselves. Hiding the tab is not access control.
export async function requireAdmin() {
  const { user, profile } = await getMember();
  if (!user || !profile?.is_admin) return null;
  return profile;
}

export const EMAIL_DOMAIN = 'members.gym.local';   // must match the edge function
export const emailFor = (username) => `${username}@${EMAIL_DOMAIN}`;
export const sixDigits = () => String(Math.floor(100000 + Math.random() * 900000));
