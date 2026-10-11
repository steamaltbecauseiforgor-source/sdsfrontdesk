import type { Context, Config } from "@netlify/edge-functions";

const COOKIE_NAME = "sds_auth_session";

// Secret used to sign session cookies. Falls back to a deterministic string if not set in env.
function getSecret(): string {
  return Netlify.env.get("AUTH_SECRET") || "sds-front-desk-hub-secure-auth-token-2026";
}

function getValidCredentials(): { username: string; password: string } {
  const username = Netlify.env.get("AUTH_USERNAME") || "sdsc3032";
  const password = Netlify.env.get("AUTH_PASSWORD") || "texasdpssds";
  return { username, password };
}

async function createSignature(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(value)
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const [data, signature] = token.split(".");
  if (!data || !signature) return false;

  const expectedSignature = await createSignature(data, secret);
  if (signature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(atob(data));
    if (!payload.u || !payload.exp) return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

async function generateSessionToken(username: string, secret: string): Promise<string> {
  // Session valid for 14 days
  const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ u: username, exp: expiresAt });
  const data = btoa(payload);
  const signature = await createSignature(data, secret);
  return `${data}.${signature}`;
}

function renderLoginPage(options: {
  errorMessage?: string;
  infoMessage?: string;
  returnUrl?: string;
}): Response {
  const { errorMessage, infoMessage, returnUrl = "/" } = options;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SDS Front Desk - Sign In</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f0f2f5;
      color: #333;
      display: flex;
      min-height: 100vh;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      border-top: 5px solid #1e88e5;
    }
    .header {
      padding: 28px 24px 20px;
      text-align: center;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e88e5;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 14px;
      color: #666;
    }
    .form-container {
      padding: 0 24px 28px;
    }
    .info-banner {
      background-color: #ecfdf5;
      border: 1px solid #10b981;
      color: #065f46;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .error-banner {
      background-color: #fee2e2;
      border: 1px solid #ef4444;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #444;
    }
    input[type="text"],
    input[type="password"] {
      width: 100%;
      padding: 11px 12px;
      border: 1px solid #ccd0d5;
      border-radius: 6px;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input[type="text"]:focus,
    input[type="password"]:focus {
      border-color: #1e88e5;
      box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.15);
    }
    .submit-btn {
      width: 100%;
      background: #1e88e5;
      color: #ffffff;
      border: none;
      padding: 12px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .submit-btn:hover {
      background: #1565c0;
    }
    .footer {
      text-align: center;
      margin-top: 18px;
      font-size: 12px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="header">
      <h1>SDS Front Desk Hub</h1>
      <p>Authorized Personnel Access Only</p>
    </div>
    <div class="form-container">
      ${
        infoMessage
          ? `<div class="info-banner"><span>✓</span> <span>${escapeHtml(infoMessage)}</span></div>`
          : ""
      }
      ${
        errorMessage
          ? `<div class="error-banner"><span>⚠️</span> <span>${escapeHtml(errorMessage)}</span></div>`
          : ""
      }
      <form method="POST" action="/auth/login">
        <input type="hidden" name="return_url" value="${escapeHtml(returnUrl)}" />
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required autofocus autocomplete="username" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="submit-btn">Sign In</button>
      </form>
      <div class="footer">
        Southlake Driving School &bull; Front Desk Portal
      </div>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: errorMessage ? 401 : 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const secret = getSecret();
  const credentials = getValidCredentials();

  // Handle logout / signout routes (GET and POST)
  const isLogoutRoute =
    url.pathname === "/auth/logout" ||
    url.pathname === "/logout" ||
    url.pathname === "/signout" ||
    url.pathname === "/auth/signout";

  if (isLogoutRoute) {
    try {
      context.cookies.delete({
        name: COOKIE_NAME,
        path: "/",
      });
    } catch {
      // Fallback
    }
    const redirectUrl = new URL("/auth/login?logged_out=1", req.url).toString();
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        "Set-Cookie": `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // Handle login page GET request
  if (url.pathname === "/auth/login" && req.method === "GET") {
    const isLoggedOut = url.searchParams.get("logged_out") === "1";

    if (!isLoggedOut) {
      const existingCookie = context.cookies.get(COOKIE_NAME);
      if (existingCookie && (await verifySessionToken(existingCookie, secret))) {
        return Response.redirect(new URL("/", req.url).toString(), 302);
      }
    }

    const returnUrl = url.searchParams.get("return_url") || "/";
    return renderLoginPage({
      infoMessage: isLoggedOut ? "You have been signed out successfully." : undefined,
      returnUrl,
    });
  }

  // Handle login POST submission
  if (url.pathname === "/auth/login" && req.method === "POST") {
    let username = "";
    let password = "";
    let returnUrl = "/";

    try {
      const formData = await req.formData();
      username = (formData.get("username") as string) || "";
      password = (formData.get("password") as string) || "";
      returnUrl = (formData.get("return_url") as string) || "/";
      if (!returnUrl.startsWith("/")) {
        returnUrl = "/";
      }
    } catch {
      return renderLoginPage({
        errorMessage: "Invalid form submission. Please try again.",
      });
    }

    if (
      username.trim() === credentials.username &&
      password === credentials.password
    ) {
      const sessionToken = await generateSessionToken(username, secret);
      context.cookies.set({
        name: COOKIE_NAME,
        value: sessionToken,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 14 * 24 * 60 * 60, // 14 days
      });
      return Response.redirect(new URL(returnUrl, req.url).toString(), 302);
    } else {
      return renderLoginPage({
        errorMessage: "Incorrect username or password. Please try again.",
        returnUrl,
      });
    }
  }

  // Check if session cookie exists and is valid
  const sessionCookie = context.cookies.get(COOKIE_NAME);
  if (sessionCookie && (await verifySessionToken(sessionCookie, secret))) {
    // Valid session, pass through to static content / origin
    return;
  }

  // Unauthenticated user attempting to access protected resources
  const returnUrl = url.pathname + url.search;
  return renderLoginPage({ returnUrl });
};

export const config: Config = {
  path: "/*",
  excludedPath: ["/favicon.ico"],
};
