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

export interface AdminUser {
  id: string
  email: string
  name: string
  roleId: string
  roleName: string
  status: 'active' | 'inactive'
  createdAt: string
  lastLogin?: string
  avatar?: string
}
export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  createdAt: string
}

export interface PermissionGroup {
  group: string
  permissions: { key: string; label: string }[]
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  message: string
  data?: T
  errors?: Record<string, string[]>
}
export interface BackendUser {
  id: number
  role_id: number | null
  name: string
  email: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
  role?: BackendRole | null
}
export interface BackendRole {
  id: number
  name: string
  slug: string
  description: string | null
  created_at: string
  updated_at: string
  permissions?: BackendPermission[]
  users_count?: number
}
export interface BackendPermission {
  id: number
  name: string
  display_name: string
  slug: string
  group: string
  module: string
  description: string | null
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  email: string
  reset_token: string
  password: string
  password_confirmation: string
}

export interface PasswordResetResponse {
  status: string
  message: string
}

export type ProfileResponse = AuthResponse

export interface PaginatedData<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type EnrollmentStatus = 'pending' | 'approved' | 'enrolled' | 'rejected'

export interface BackendEnrollment {
  id: number
  student_name: string
  student_id: string
  program: string
  batch: string
  academic_year: string
  status: EnrollmentStatus
  submitted_at: string
  processed_at: string | null
  processed_by: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface Enrollment {
  id: string
  studentName: string
  studentId: string
  program: string
  batch: string
  academicYear: string
  status: EnrollmentStatus
  submittedAt: string
  processedAt?: string
  processedBy?: string
  notes?: string
}

export interface CreateEnrollmentPayload {
  student_name: string
  student_id: string
  program: string
  batch: string
  academic_year: string
  notes?: string
}

export interface UpdateEnrollmentPayload {
  student_name?: string
  student_id?: string
  program?: string
  batch?: string
  academic_year?: string
  status?: EnrollmentStatus
  notes?: string
}

export const ALL_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: 'Administration',
    permissions: [
      { key: 'users.manage', label: 'Manage Users' },
      { key: 'roles.manage', label: 'Manage Roles' },
      { key: 'audit.view', label: 'View Audit Logs' },
      { key: 'settings.manage', label: 'Manage Settings' },
    ],
  },
  {
    group: 'Students',
    permissions: [
      { key: 'students.view', label: 'View Students' },
      { key: 'students.edit', label: 'Edit Students' },
      { key: 'students.import', label: 'Import Students' },
    ],
  },
  {
    group: 'Enrollment',
    permissions: [
      { key: 'enrollment.manage', label: 'Manage Enrollment' },
    ],
  },
  {
    group: 'ID Cards',
    permissions: [
      { key: 'cards.generate', label: 'Generate ID Cards' },
    ],
  },
  {
    group: 'Student Records',
    permissions: [
      { key: 'records.view', label: 'View Records' },
      { key: 'records.manage', label: 'Manage Records' },
    ],
  },
  {
    group: 'Evaluation',
    permissions: [
      { key: 'evaluation.view', label: 'View Evaluations' },
      { key: 'evaluation.manage', label: 'Manage Evaluations' },
      { key: 'evaluation.submit', label: 'Submit Evaluation' },
    ],
  },
  {
    group: 'Reports',
    permissions: [
      { key: 'reports.view', label: 'View Reports' },
    ],
  },
]
