export type ImageOutputFormat = "jpeg" | "gif";

export type NotificationTemplateInput = {
  title: string;
  content?: string;
  app: string;
  width?: number;
  height?: number;
};

export type GenerateTemplateRequest =
  | {
      template: "notification";
      input: NotificationTemplateInput;
    };

export type GeneratedTemplateImage = {
  bytes: Uint8Array;
  format: ImageOutputFormat;
};
