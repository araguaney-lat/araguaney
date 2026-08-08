import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken: string
    accessTokenExpires?: number
    error?: string
    userId: string
    platformRole: string | null
    centerRole: string | null
    centerId: string | null
    mustChangePassword: boolean
    mustAcceptTerms: boolean
  }

  interface User {
    accessToken: string
    refreshToken: string
    accessTokenExpires?: number
    userId: string
    platformRole: string | null
    centerRole: string | null
    centerId: string | null
    mustChangePassword: boolean
    mustAcceptTerms: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    // Solo vive aquí (cookie cifrada del servidor); nunca se copia a Session.
    refreshToken: string
    accessTokenExpires?: number
    error?: string
    userId: string
    platformRole: string | null
    centerRole: string | null
    centerId: string | null
    mustChangePassword: boolean
    mustAcceptTerms: boolean
  }
}
