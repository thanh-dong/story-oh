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
  story_tree: StoryTree;
  created_at: string;
}

export interface UserStory {
  user_id: string;
  story_id: string;
  progress: {
    current_node: string;
    history: string[];
  };
  story?: Story;
}
