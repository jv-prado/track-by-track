export interface UpdateProfileInput {
  userId: string;
  displayName: string;
}

export interface UpdateProfileOutput {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}
