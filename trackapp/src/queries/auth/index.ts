export { authKeys } from "./keys";
export { useCurrentUserQuery } from "./useCurrentUserQuery";
export { useSessionQuery, sessionQueryOptions } from "./useSessionQuery";
export { useRegisterMutation, type RegisterInput } from "./useRegisterMutation";
export { useLoginMutation, type LoginInput } from "./useLoginMutation";
export { useLogoutMutation } from "./useLogoutMutation";
export {
  useUpdateProfileMutation,
  type UpdateProfileInput,
} from "./useUpdateProfileMutation";
export {
  useDeleteAccountMutation,
  type DeleteAccountInput,
} from "./useDeleteAccountMutation";
export {
  useRequestPasswordResetMutation,
  type RequestPasswordResetInput,
} from "./useRequestPasswordResetMutation";
export {
  useResetPasswordMutation,
  type ResetPasswordInput,
} from "./useResetPasswordMutation";

// useUploadAvatarMutation não portado nesta fase — RN precisa de
// expo-image-picker + FormData com { uri, name, type } em vez de File do
// browser; fica pra fase de mídia/perfil (não bloqueia login/registro).
