export interface StoryChoice {
  label: string;
  next: string;
}

export interface StoryNode {
  text: string;
  image?: string;
  choices: StoryChoice[];
}

export interface StoryTree {
  [nodeId: string]: StoryNode;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  cover_image: string | null;
  price: number;
  age_range: string;
  require_login: boolean;
  story_tree: StoryTree;
  created_by: string | null;
  created_at: string;
}

export interface UserStory {
  id: string;
  user_id: string;
  story_id: string;
  child_id: string | null;
  progress: {
    current_node: string;
    history: string[];
  };
  story?: Story;
}

export interface GenerateStoryRequest {
  keyword: string;
  language: "en" | "vi" | "de";
  audienceAge: "4-8" | "8-12";
  isForChildren: boolean;
  expectedReadingTime: number;
  difficulty: "easy" | "medium" | "hard";
  minBranches: number;
  maxBranches: number;
}

export interface GenerateStoryResponse {
  title: string;
  summary: string;
  age_range: string;
  story_tree: StoryTree;
}

export interface Child {
  id: string;
  parentId: string;
  name: string;
  dateOfBirth: string;
  avatar: string;
  nativeLanguage: string;
  learningLanguages: string[];
  interests: string[];
  dailyGoalMinutes: number | null;
  createdAt: string;
}

export interface ChildWithStats extends Child {
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
}
