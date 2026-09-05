import type { ComponentType } from "react";
import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import LessonsPage from "../features/lessons/LessonsPage";
import LessonDetailPage from "../features/lessons/LessonDetailPage";
import RecordPage from "../features/lessons/RecordPage";
import QuestionBankPage from "../features/questions/QuestionBankPage";
import QuestionDetailPage from "../features/questions/QuestionDetailPage";
import UploadPage from "../features/questions/UploadPage";
import PracticeSetupPage from "../features/practice/PracticeSetupPage";
import PracticeRunPage from "../features/practice/PracticeRunPage";
import ReviewTodayPage from "../features/review/ReviewTodayPage";
import ReviewCalendarPage from "../features/review/ReviewCalendarPage";
import ReviewOnboardingPage from "../features/review/ReviewOnboardingPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";
import SettingsPage from "../features/settings/SettingsPage";

export interface RouteDef {
  path: string;
  element: ComponentType;
}

export const routes: RouteDef[] = [
  { path: "/login", element: LoginPage },
  { path: "/register", element: RegisterPage },
  { path: "/app", element: DashboardPage },
  { path: "/app/lessons", element: LessonsPage },
  { path: "/app/lessons/:lessonId", element: LessonDetailPage },
  { path: "/app/lessons/:lessonId/record", element: RecordPage },
  { path: "/app/questions", element: QuestionBankPage },
  { path: "/app/questions/:questionId", element: QuestionDetailPage },
  { path: "/app/questions/upload", element: UploadPage },
  { path: "/app/practice", element: PracticeSetupPage },
  { path: "/app/practice-sets/:setId", element: PracticeRunPage },
  { path: "/app/review", element: ReviewTodayPage },
  { path: "/app/review/onboarding", element: ReviewOnboardingPage },
  { path: "/app/review/calendar", element: ReviewCalendarPage },
  { path: "/app/analytics", element: AnalyticsPage },
  { path: "/app/settings", element: SettingsPage },
  { path: "*", element: () => <Navigate to="/app" replace /> },
] as RouteDef[];

import { Navigate } from "react-router-dom";
