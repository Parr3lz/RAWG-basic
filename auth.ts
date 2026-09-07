import crypto from 'crypto';

export function parseCookies(header: string | undefined): {[key: string] : string} { 
    if (!header) {
        return {};
    }
    const result: Record<string, string> = {};
    const cookies = header.split("; ");
    for (const cookie of cookies) {
        const idx = cookie.indexOf("=");
        const key = cookie.slice(0, idx);
        const value = cookie.slice(idx + 1);
        result[key] = value;
      }   
    return result;
  }

  export function signSession(data: object): string {
    const dataWithExpiry = { ...data, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
    const json = JSON.stringify(dataWithExpiry);
    const encoded = Buffer.from(json).toString('base64');
    const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
  }

  export function verifySession(cookieValue: string): any | null {
    const [encoded, signature] = cookieValue.split(".");
    const expectedSignature = crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(encoded).digest('hex');
    if (expectedSignature !== signature) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
    if (payload.exp < Date.now()) {
      return null;
  }
    return payload;
  }

  export function getDiscordAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      response_type: "code",
      scope: "identify",
      state: state,
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  export async function exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    });

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Discord token exchange failed: ${response.status}`);
    }

    return response.json() as Promise<{ access_token: string }>;
  }

  export async function fetchDiscordUser(access_token: string): Promise<{ id: string, username: string, avatar: string }> {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch Discord user: ${response.status}`);
    }
    return response.json() as Promise<{ id: string, username: string, avatar: string }>;
  }

  export function getCurrentUser (req: any) {
    const cookies = parseCookies (req.headers.cookie);
    if (!cookies.session) {
      return null;
    } 
    const session = verifySession(cookies.session);
    return session;
  }