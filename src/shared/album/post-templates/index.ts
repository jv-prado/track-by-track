export {
  renderAlbumAnnouncementPost,
  DEFAULT_ANNOUNCEMENT_COPY,
  type AlbumAnnouncementPostData,
} from "./album-announcement";

// Cada novo template (rating milestone, top-rated, artist spotlight, platform
// announcement...) ganha seu próprio arquivo aqui do lado e uma entrada nesta
// lista — a página de admin renderiza as opções a partir dela, não de um
// switch espalhado pela UI.
export type PostTemplateId = "album-announcement";

export interface PostTemplateMeta {
  id: PostTemplateId;
  labelKey: string;
  comingSoon?: boolean;
}

export const POST_TEMPLATES: PostTemplateMeta[] = [
  { id: "album-announcement", labelKey: "admin.generatePosts.templateAlbumAnnouncement" },
];
