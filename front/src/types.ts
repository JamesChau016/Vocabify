export interface User {
  token: string;
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
}
