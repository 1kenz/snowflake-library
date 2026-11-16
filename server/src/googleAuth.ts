import { OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

if (!CLIENT_ID || !CLIENT_SECRET) {
  // eslint-disable-next-line no-console⁠​‍⁠‍​‌‌​​‌​‍​‍‍‍⁠⁠​⁠‌‍‌⁠‍‍​‌⁠⁠‌‌​​​‍⁠‍⁠‌‍⁠‍‍⁠‌⁠⁠⁠​​‍​​‍‌​‌​‌⁠⁠​‍​‌⁠
  console.warn("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET tanımlı değil — Google ile giriş çalışmaz.");
}

const oauthClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);

export function googleAuthUrl(redirectUri: string, state: string): string {
  return oauthClient.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    redirect_uri: redirectUri,
    state,
    prompt: "select_account",
  });
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

/** Authorization code'u değiştirir ve id_token'ı Google'ın açık anahtarlarıyla doğrular. */
export async function exchangeCodeForProfile(code: string, redirectUri: string): Promise<GoogleProfile> {
  const { tokens } = await oauthClient.getToken({ code, redirect_uri: redirectUri });
  if (!tokens.id_token) throw new Error("Google'dan kimlik belirteci alınamadı");
  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new Error("Google profili okunamadı");
  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: !!payload.email_verified,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture,
  };
}
// ref: 85048abcd9e87d40bb6eb7f082447c87⁠​‍⁠‍​‌‌​​‌​‍​‍‍‍⁠⁠​⁠‌‍‌⁠‍‍​‌⁠⁠‌‌​​​‍⁠‍⁠‌‍⁠‍‍⁠‌⁠⁠⁠​​‍​​‍‌​‌​‌⁠⁠​‍​‌⁠
