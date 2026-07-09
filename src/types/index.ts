export interface User {
  id: number
  email: string
  name: string
  role: string
  avatar?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  permissions: string[]
  user: User
}

export interface ProfileResponse {
  status: string
  message: string
  user: User
  permissions: string[]
}


