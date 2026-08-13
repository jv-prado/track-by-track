export interface RegisterUserInput {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterUserOutput {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}
