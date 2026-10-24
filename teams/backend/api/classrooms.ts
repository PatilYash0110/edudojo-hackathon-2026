/**
 * Classrooms, their chat, quizzes, answers and dashboards.
 * Routes: app/api/dojo/classrooms/**, quizzes/**, analytics/**. OWNER: BACKEND TEAM.
 */
import type { NextRequest } from 'next/server';

import {
  AnswerBody,
  ChatBody,
  CreateClassroomBody,
  StartQuizBody,
} from '@/teams/shared/contracts/backend-api';

import { chat, chatHistory } from '../agents/chat';
import { studentDashboard, teacherDashboard } from '../analytics/dashboards';
import { answerQuestion, startQuiz } from '../assessment/quiz';
import { requireUser } from '../auth/session';
import {
  createClassroom as create,
  listClassrooms as list,
  loadClassroom,
  refreshClassroom,
  toClassroom,
} from '../generation/classroom';
import { DojoError, handle, ok, readBody } from './http';

type Params<K extends string> = { params: Promise<Record<K, string>> };

export function listClassrooms(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    return ok({ classrooms: (await list(user)).map((row) => toClassroom(row)) });
  });
}

export function createClassroom(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    return create(req, user, await readBody(req, CreateClassroomBody));
  });
}

/** Poll this every 5 s while `status` is `generating`. */
export function getClassroom(req: NextRequest, { params }: Params<'classroomId'>) {
  return handle(async () => {
    const user = await requireUser(req);
    const row = await loadClassroom(user, (await params).classroomId);
    return ok({ classroom: await refreshClassroom(row) });
  });
}

export function getChat(req: NextRequest, { params }: Params<'classroomId'>) {
  return handle(async () => {
    const user = await requireUser(req);
    const row = await loadClassroom(user, (await params).classroomId);
    return ok({ messages: await chatHistory(row.id, user.id) });
  });
}

export function postChat(req: NextRequest, { params }: Params<'classroomId'>) {
  return handle(async () => {
    const user = await requireUser(req);
    const row = await loadClassroom(user, (await params).classroomId);
    const { message } = await readBody(req, ChatBody);
    return chat(req, user, row, message);
  });
}

export function postQuiz(req: NextRequest, { params }: Params<'classroomId'>) {
  return handle(async () => {
    const user = await requireUser(req);
    const row = await loadClassroom(user, (await params).classroomId);
    const { floorId } = await readBody(req, StartQuizBody);
    return ok({ quiz: await startQuiz(user, row, floorId) }, 201);
  });
}

export function postAnswer(req: NextRequest, { params }: Params<'quizId'>) {
  return handle(async () => {
    const user = await requireUser(req, 'student');
    const answer = await readBody(req, AnswerBody);
    return ok({ result: await answerQuestion(user, (await params).quizId, answer) });
  });
}

function classroomIdParam(req: NextRequest): string {
  const id = req.nextUrl.searchParams.get('classroomId');
  if (!id) throw new DojoError('INVALID_REQUEST', 'classroomId fehlt.');
  return id;
}

export function getStudentAnalytics(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req);
    const row = await loadClassroom(user, classroomIdParam(req));
    return ok({ dashboard: await studentDashboard(user, row) });
  });
}

export function getTeacherAnalytics(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, 'teacher');
    const row = await loadClassroom(user, classroomIdParam(req));
    return ok({ dashboard: await teacherDashboard(user, row) });
  });
}
