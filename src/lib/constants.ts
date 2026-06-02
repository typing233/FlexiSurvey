export const QUESTION_TYPES = {
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  TEXT: "text",
} as const;

export const SURVEY_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
} as const;

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "单选题",
  multiple_choice: "多选题",
  text: "文本题",
};

export const SURVEY_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  published: "已发布",
  closed: "已关闭",
};
