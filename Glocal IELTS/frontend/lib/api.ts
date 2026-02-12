import axios from "axios";

const backendBaseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

export type Level =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "upper_intermediate"
  | "advanced";

export type Skill = "listening" | "speaking" | "reading" | "writing";

export interface TestGenerationResponse {
  level: Level;
  skill: Skill;
  content: any;
}

export interface ScoreResponse {
  level: Level;
  skill: Skill;
  band: number;
  details: any;
}

export async function generateTest(level: Level, skill: Skill) {
  const res = await axios.post<TestGenerationResponse>(
    `${backendBaseURL}/api/tests/generate`,
    { level, skill }
  );
  return res.data;
}

export async function scoreTest(
  level: Level,
  skill: Skill,
  content: any,
  answers: Record<string, any>
) {
  const res = await axios.post<ScoreResponse>(
    `${backendBaseURL}/api/tests/score`,
    { level, skill, content, answers }
  );
  return res.data;
}


