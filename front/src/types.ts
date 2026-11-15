export interface User {
  username: string;
  name: string;
}

export interface Credential {
  username: string;
  password: string;
}

export interface RegisterCredential {
  username: string;
  name: string;
  password: string;
  email?: string;
}

export interface List {
  id: string;
  name: string;
  author: string;
  description?: string;
  dateCreated: string;
  user: User;
  list: Word[];
}

export interface Word {
  id: string;
  term: string;
  definition?: string;
  sentence?: string;
  sourceUrl?: string;
}

export interface ReviewState {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueAt: string;
}

export interface DueWord {
  id: string;
  term: string;
  definition?: string;
  listId: string;
  reviewState: ReviewState | null;
}

export type Grade = 0 | 1 | 2 | 3;
