import { createI18n } from 'vue-i18n'

export type Locale = 'en' | 'kh'

const messages: Record<Locale, Record<string, string>> = {
  en: {
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back, {name}. Here\'s your enrollment overview.',
    'dashboard.total': 'TOTAL',
    'dashboard.pending': 'PENDING',
    'dashboard.enrolled': 'ENROLLED',
    'dashboard.rejected': 'REJECTED',
    'dashboard.enroll_rate': 'ENROLL. RATE',
    'dashboard.all_intakes': 'all intakes',
    'dashboard.awaiting_review': 'awaiting review',
    'dashboard.active_students': 'active students',
    'dashboard.not_admitted': 'not admitted',
    'dashboard.enrolled_total': 'enrolled / total',
    'dashboard.updated_ago': 'Updated 2m ago',
    'enrollment_flow.title': 'Enrollment Flow',
    'enrollment_flow.subtitle': 'Monthly submitted vs enrolled students',
    'enrollment_flow.submitted': 'Submitted',
    'enrollment_flow.enrolled': 'Enrolled',
    'quick_actions.title': 'Quick Actions',
    'quick_actions.new_enrollment': 'New Enrollment',
    'quick_actions.review': 'Review Applications',
    'quick_actions.manage_students': 'Manage Students',
    'quick_actions.view_reports': 'View Reports',
    'enrollment_by_batch.title': 'Enrollment by Batch',
    'enrollment_by_batch.subtitle': 'Total enrolled students per academic year',
    'enrollment_by_batch.label': 'Enrolled Students',
    'recent_activity.title': 'Recent Activity',
    'recent_activity.subtitle': 'Latest system actions and updates',
    'recent_activity.last_24h': 'Last 24h',
    'recent_activity.imported': 'Imported',
    'recent_activity.students_added': '{count} students added',
    'recent_activity.status_changed': 'Status changed',
    'recent_activity.pdf_generated': 'Batch ID-card PDF generated',
    'recent_activity.cards': '{count} cards',
    'recent_requests.title': 'Recent Enrollment Requests',
    'recent_requests.subtitle': 'Latest student enrollment applications',
    'recent_requests.view_all': 'View all',
    'recent_requests.student': 'Student',
    'recent_requests.id': 'Student ID',
    'recent_requests.program': 'Program',
    'recent_requests.date': 'Date',
    'recent_requests.status': 'Status',
    'chart.badge_grouped_bar': 'Grouped Bar',
    'chart.badge_bar': 'Bar Chart',
    'chart.badge_doughnut': 'Doughnut',
    'doughnut.title': 'Enrollment by Program',
    'recent_activity.enrolled_badge': 'Enrolled',
    'admin': 'Admin',
    'staff': 'Staff',
    'pending': 'pending',
    'approved': 'approved',
    'rejected': 'rejected',
  },
  kh: {
    'dashboard.title': 'ផ្ទាំងគ្រប់គ្រង',
    'dashboard.welcome': 'សូមស្វាគមន៍ត្រឡប់មកវិញ, {name}។ នេះជាទិដ្ឋភាពទូទៅនៃការចុះឈ្មោះរបស់អ្នក។',
    'dashboard.total': 'សរុប',
    'dashboard.pending': 'កំពុងរង់ចាំ',
    'dashboard.enrolled': 'បានចុះឈ្មោះ',
    'dashboard.rejected': 'ត្រូវបានច្រានចោល',
    'dashboard.enroll_rate': 'អត្រាចុះឈ្មោះ',
    'dashboard.all_intakes': 'រាល់ការទទួល',
    'dashboard.awaiting_review': 'កំពុងរង់ចាំការពិនិត្យ',
    'dashboard.active_students': 'និស្សិតសកម្ម',
    'dashboard.not_admitted': 'មិនត្រូវបានទទួល',
    'dashboard.enrolled_total': 'បានចុះឈ្មោះ / សរុប',
    'dashboard.updated_ago': 'បានធ្វើបច្ចុប្បន្នភាព ២ នាទីមុន',
    'enrollment_flow.title': 'លំហូរការចុះឈ្មោះ',
    'enrollment_flow.subtitle': 'ការដាក់ស្នើប្រចាំខែធៀបនឹងនិស្សិតដែលបានចុះឈ្មោះ',
    'enrollment_flow.submitted': 'បានដាក់ស្នើ',
    'enrollment_flow.enrolled': 'បានចុះឈ្មោះ',
    'quick_actions.title': 'សកម្មភាពរហ័ស',
    'quick_actions.new_enrollment': 'ចុះឈ្មោះថ្មី',
    'quick_actions.review': 'ពិនិត្យពាក្យសុំ',
    'quick_actions.manage_students': 'គ្រប់គ្រងនិស្សិត',
    'quick_actions.view_reports': 'មើលរបាយការណ៍',
    'enrollment_by_batch.title': 'ការចុះឈ្មោះតាមវគ្គ',
    'enrollment_by_batch.subtitle': 'ចំនួននិស្សិតសរុបដែលបានចុះឈ្មោះតាមឆ្នាំសិក្សា',
    'enrollment_by_batch.label': 'និស្សិតដែលបានចុះឈ្មោះ',
    'recent_activity.title': 'សកម្មភាពថ្មីៗ',
    'recent_activity.subtitle': 'សកម្មភាពប្រព័ន្ធ និងការអាប់ដេតចុងក្រោយ',
    'recent_activity.last_24h': '២៤ ម៉ោងចុងក្រោយ',
    'recent_activity.imported': 'បាននាំចូល',
    'recent_activity.students_added': '{count} និស្សិតបានបន្ថែម',
    'recent_activity.status_changed': 'បានផ្លាស់ប្តូរស្ថានភាព',
    'recent_activity.pdf_generated': 'បានបង្កើត PDF អត្តសញ្ញាណប័ណ្ណ',
    'recent_activity.cards': '{count} សន្លឹក',
    'recent_requests.title': 'សំណើចុះឈ្មោះថ្មីៗ',
    'recent_requests.subtitle': 'ពាក្យសុំចុះឈ្មោះចុងក្រោយរបស់និស្សិត',
    'recent_requests.view_all': 'មើលទាំងអស់',
    'recent_requests.student': 'និស្សិត',
    'recent_requests.id': 'លេខសម្គាល់',
    'recent_requests.program': 'កម្មវិធីសិក្សា',
    'recent_requests.date': 'កាលបរិច្ឆេទ',
    'recent_requests.status': 'ស្ថានភាព',
    'chart.badge_grouped_bar': 'ក្រាហ្វជួរឈរ',
    'chart.badge_bar': 'ក្រាហ្វជួរឈរ',
    'chart.badge_doughnut': 'ដូណាត់',
    'doughnut.title': 'ការចុះឈ្មោះតាមកម្មវិធី',
    'recent_activity.enrolled_badge': 'បានចុះឈ្មោះ',
    'admin': 'អ្នកគ្រប់គ្រង',
    'staff': 'បុគ្គលិក',
    'pending': 'កំពុងរង់ចាំ',
    'approved': 'បានអនុម័ត',
    'rejected': 'ត្រូវបានច្រានចោល',
  },
}

function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem('locale')
    if (saved === 'en' || saved === 'kh') return saved
  } catch {
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: 'en',
  messages,
})

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem('locale', locale)
  } catch {
  }
}
