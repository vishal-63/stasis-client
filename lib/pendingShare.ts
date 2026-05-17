let pendingUrl: string | null = null;

export const pendingShare = {
  set: (url: string) => {
    pendingUrl = url;
  },
  get: () => pendingUrl,
  clear: () => {
    pendingUrl = null;
  },
};
