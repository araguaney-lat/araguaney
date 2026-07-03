import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username" },
        password: { label: "Password", type: "password" },
        // Bypass field: populated after TOTP challenge completes
        accessToken: { label: "Access Token" },
      },
      async authorize(credentials) {
        // Post-TOTP bypass: token already verified by backend
        if (credentials.accessToken) {
          const token = credentials.accessToken as string
          const meRes = await fetch(`${API_URL}/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!meRes.ok) return null
          const me = await meRes.json()
          return {
            accessToken: token,
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
        token.platformRole = user.platformRole
        token.centerRole = user.centerRole
        token.centerId = user.centerId
        token.userId = user.userId
        token.mustChangePassword = user.mustChangePassword
        token.mustAcceptTerms = user.mustAcceptTerms
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.platformRole = token.platformRole
      session.centerRole = token.centerRole
      session.centerId = token.centerId
      session.userId = token.userId
      session.mustChangePassword = token.mustChangePassword
      session.mustAcceptTerms = token.mustAcceptTerms
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})

function _extractSub(jwt: string): string {
  try {
    const [, b64] = jwt.split(".")
    const payload = JSON.parse(Buffer.from(b64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString())
    return payload.sub ?? ""
  } catch {
    return ""
  }
}
