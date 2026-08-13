export interface GetCurrentUserInput {
  userId: string;
}

export interface GetCurrentUserOutput {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  mustResetPassword: boolean;
  createdAt: string;
}
