/**
 * Every /api/dojo path. Request/response types: ./backend-api.ts.
 * OWNER: BACKEND TEAM. Auth is a cookie (`dojo_session`) set by the auth routes.
 */
export const DOJO_API = {
  // Auth
  teacherSignup: '/api/dojo/auth/teacher/signup', // POST TeacherSignupBody → { user: Me }
  teacherLogin: '/api/dojo/auth/teacher/login', // POST TeacherLoginBody → { user: Me }
  join: '/api/dojo/auth/join', // POST StudentJoinBody → { user: Me }
  logout: '/api/dojo/auth/logout', // POST → {}
  me: '/api/dojo/me', // GET → { user: Me | null }

  // Classes (teacher)
  classes: '/api/dojo/classes', // GET → { classes: ClassSummary[] }; POST CreateClassBody → { class: ClassSummary }
  class: (classId: string) => `/api/dojo/classes/${classId}`, // GET → { class: ClassDetail }; DELETE → {}
  rotatePin: (classId: string) => `/api/dojo/classes/${classId}/pin`, // POST → { class: ClassSummary }
  leaderboard: (classId: string) => `/api/dojo/classes/${classId}/leaderboard`, // GET → { entries: LeaderboardEntry[] }

  // Classrooms
  classrooms: '/api/dojo/classrooms', // GET → { classrooms: Classroom[] }; POST CreateClassroomBody → 202 { classroom }
  classroom: (id: string) => `/api/dojo/classrooms/${id}`, // GET → { classroom: Classroom } (poll every 5 s while generating)
  chat: (id: string) => `/api/dojo/classrooms/${id}/chat`, // GET → { messages: ChatMessage[] }; POST ChatBody → SSE
  quizzes: (id: string) => `/api/dojo/classrooms/${id}/quizzes`, // POST StartQuizBody → { quiz: Quiz }
  answer: (quizId: string) => `/api/dojo/quizzes/${quizId}/answers`, // POST AnswerBody → { result: AnswerResult }

  // Dashboards
  studentAnalytics: (classroomId: string) =>
    `/api/dojo/analytics/student?classroomId=${encodeURIComponent(classroomId)}`, // GET → { dashboard: StudentDashboard }
  teacherAnalytics: (classroomId: string) =>
    `/api/dojo/analytics/teacher?classroomId=${encodeURIComponent(classroomId)}`, // GET → { dashboard: TeacherDashboard }
} as const;
