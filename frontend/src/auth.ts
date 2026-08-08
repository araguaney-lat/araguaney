import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import type { JWT } from "next-auth/jwt"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

// Margen para renovar antes de que el access caduque de verdad: evita usar un
// token que expira a mitad de una petición.
const REFRESH_SKEW_MS = 60_000

export const { handlers, signIn, signOut, auth } = NextAuth({
  // La cookie de NextAuth vive tanto como el refresh token del backend (30
  // días): mientras el refresh siga vivo, la sesión se renueva sola en el
  // callback jwt. El access token dura poco y se renueva por debajo; su
  // caducidad ya no termina la sesión.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username" },
        password: { label: "Password", type: "password" },
        // Campos de bypass: poblados tras completar el reto TOTP.
        accessToken: { label: "Access Token" },
        refreshToken: { label: "Refresh Token" },
      },
      async authorize(credentials) {
        // Bypass post-TOTP: el token ya lo verificó el backend en el reto.
        if (credentials.accessToken) {
          const token = credentials.accessToken as string
          const meRes = await fetch(`${API_URL}/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!meRes.ok) return null
          const me = await meRes.json()
          return {
            accessToken: token,
            refreshToken: (credentials.refreshToken as string) ?? "",
            accessTokenExpires: _extractExp(token),
            platformRole: me.role ?? null,
            centerRole: me.center_role ?? null,
            centerId: me.center_id ?? null,
            userId: me.id,
            mustChangePassword: false,
            mustAcceptTerms: me.must_accept_terms ?? false,
          }
        }

        const form = new URLSearchParams()
        form.append("username", credentials.identifier as string)
        form.append("password", credentials.password as string)

        const res = await fetch(`${API_URL}/v1/auth/login`, {
          method: "POST",
          body: form,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })

        if (res.status === 202) {
          const data = await res.json()
          throw new Error(`TOTP_REQUIRED:${data.partial_token}`)
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error?.code ?? data.error?.message ?? "Invalid credentials")
        }

        const data = await res.json()
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? "",
          accessTokenExpires: _extractExp(data.access_token),
          platformRole: data.role ?? null,
          centerRole: data.center_role ?? null,
          centerId: data.center_id ?? null,
          userId: _extractSub(data.access_token),
          mustChangePassword: data.must_change_password ?? false,
          mustAcceptTerms: data.must_accept_terms ?? false,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.accessTokenExpires = user.accessTokenExpires
        token.platformRole = user.platformRole
        token.centerRole = user.centerRole
        token.centerId = user.centerId
        token.userId = user.userId
        token.mustChangePassword = user.mustChangePassword
        token.mustAcceptTerms = user.mustAcceptTerms
        return token
      }

      // Access todavía vigente (con margen): se conserva tal cual.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - REFRESH_SKEW_MS) {
        return token
      }

      // Access vencido o por vencer: se renueva con el refresh token. Si falla,
      // se marca el error para que el guardia mande a /login en vez de dejar la
      // sesión con un token muerto.
      return await _refreshAccessToken(token)
    },
    async session({ session, token }) {
      // El refresh token NO se expone en la sesión: es de larga vida y vive solo
      // en la cookie cifrada del servidor, nunca en lo que ve el cliente.
      session.accessToken = token.accessToken
      session.accessTokenExpires = token.accessTokenExpires
      session.error = token.error
      session.platformRole = token.platformRole
      session.centerRole = token.centerRole
      session.centerId = token.centerId
      session.userId = token.userId
      session.mustChangePassword = token.mustChangePassword
      session.mustAcceptTerms = token.mustAcceptTerms
      return session
    },
  },
  events: {
    // Al cerrar sesión, revoca la familia del refresh en el backend para que un
    // token filtrado no siga vivo. Se hace aquí, en el servidor, con el token de
    // la cookie: así el refresh nunca pasa por el cliente.
    async signOut(message) {
      const token = "token" in message ? message.token : null
      const refreshToken = (token as JWT | null)?.refreshToken
      const accessToken = (token as JWT | null)?.accessToken
      if (refreshToken) {
        await fetch(`${API_URL}/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {})
      }
    },
  },
  pages: {
    signIn: "/login",
  },
})

async function _refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) throw new Error("no refresh token")
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    })
    if (!res.ok) throw new Error("refresh failed")
    const data = await res.json()
    return {
      ...token,
      accessToken: data.access_token,
      // El refresh rota: se guarda el nuevo. Si el backend no lo devolviera, se
      // conserva el anterior en vez de dejar la sesión sin refresh.
      refreshToken: data.refresh_token ?? token.refreshToken,
      accessTokenExpires: _extractExp(data.access_token),
      error: undefined,
    }
  } catch {
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

// Decodifica el payload del JWT. Usa `atob`, disponible tanto en el runtime edge
// (el middleware) como en Node; `Buffer` no existe en edge, y desde que el
// callback jwt renueva el token también corre ahí. Los payloads de este backend
// son ASCII (uuid, exp), así que `atob` basta.
function _decodePayload(jwt: string): Record<string, unknown> {
  const [, b64] = jwt.split(".")
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/")
  const json = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString()
  return JSON.parse(json)
}

function _extractSub(jwt: string): string {
  try {
    const sub = _decodePayload(jwt).sub
    return typeof sub === "string" ? sub : ""
  } catch {
    return ""
  }
}

// Backend JWT `exp` is in seconds; return it as epoch milliseconds (0 if absent).
function _extractExp(jwt: string): number {
  try {
    const exp = _decodePayload(jwt).exp
    return typeof exp === "number" ? exp * 1000 : 0
  } catch {
    return 0
  }
}
