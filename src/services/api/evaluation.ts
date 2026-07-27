import axiosInstance from '@/services/axios'

export interface EvaluationCategoryScore {
  category: string
  score: number
}

export interface EvaluationSubmissionPayload {
  student_id: number
  scores: EvaluationCategoryScore[]
  total_score: number
  average_score: number
  submitted_at: string
}

export interface EvaluationSubmissionResponse {
  id: number
  student_id: number
  total_score: number
  average_score: number
  submitted_at: string
}

// ── Template types ──
export interface TemplateQuestion {
  id: number
  question: string
  max_score: number
  sort_order: number
}

export interface TemplateCategory {
  id: number
  name: string
  sort_order: number
  questions: TemplateQuestion[]
}

export interface EvaluationTemplate {
  id: number
  name: string
  description: string | null
  is_active: boolean
  categories: TemplateCategory[]
}

// ── Student evaluation types ──
export interface StudentEvaluationQuestion {
  question_id: number
  question_text: string
  score: number
  max_score: number
}

export interface StudentEvaluationCategory {
  category_id: number
  category_name: string
  total_score: number
  questions: StudentEvaluationQuestion[]
}

export interface StudentEvaluationAnswer {
  id: number
  question_id: number
  score: number
  comment: string | null
}

export interface StudentEvaluation {
  id: number
  student_id: number
  evaluation_form_id: number
  evaluation_period: string | null
  total_score: number
  status: string
  submitted_at: string | null
  category_scores: StudentEvaluationCategory[]
  answers: StudentEvaluationAnswer[]
}

export const evaluationApi = {
  /**
   * Get all evaluations for a student.
   */
  async getByStudent(studentId: number): Promise<StudentEvaluation[]> {
    const { data } = await axiosInstance.get(`/students/${studentId}/evaluations`)
    const result = data?.data ?? data
    return (Array.isArray(result) ? result : []) as StudentEvaluation[]
  },

  /**
   * Get the active evaluation template with categories and questions.
   */
  async getTemplates(): Promise<EvaluationTemplate[]> {
    const { data } = await axiosInstance.get('/evaluation-templates')
    const result = data?.data ?? data
    return (Array.isArray(result) ? result : []) as EvaluationTemplate[]
  },

  /**
   * Get a single evaluation template by ID.
   */
  async getTemplate(id: number): Promise<EvaluationTemplate | null> {
    const { data } = await axiosInstance.get(`/evaluation-templates/${id}`)
    const result = data?.data ?? data
    return (result ?? null) as EvaluationTemplate | null
  },

  /**
   * Submit a self-assessment evaluation for a student.
   * Sends answers per question along with form_id and period.
   */
  async submit(
    studentId: number,
    payload: {
      evaluation_form_id: number
      evaluation_period: string
      answers: { question_id: number; score: number; comment?: string | null }[]
    },
  ): Promise<any> {
    const { data } = await axiosInstance.post(`/students/${studentId}/evaluations`, {
      evaluation_form_id: payload.evaluation_form_id,
      evaluation_period: payload.evaluation_period,
      answers: payload.answers,
    })
    return data?.data ?? data
  },
}
