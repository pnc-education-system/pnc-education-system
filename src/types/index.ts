export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'teacher' | 'student'
  avatar?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}


