import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken: string
    userId: string
    platformRole: string | null
    centerRole: string | null
    centerId: string | null
    mustChangePassword: boolean
  }

  interface User {
    accessToken: string
    userId: string
    platformRole: string | null
    centerRole: string | null
    centerId: string | null
    mustChangePassword: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    userId: string
    platformRole: string | null
    centerRole: string | null
    centerId: string | null
    mustChangePassword: boolean
  }
}
