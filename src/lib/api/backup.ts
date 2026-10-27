// Dialogs wait on the user, so allow longer than the default query timeout
const DIALOG_TIMEOUT = 10 * 60 * 1000;

export const exportData = async () => {
  return window.api.db<{ filePath: string }>({
    path: "db/backup/export",
    timeout: DIALOG_TIMEOUT,
  });
};

export const importData = async () => {
  return window.api.db<{ safetyCopy: string }>({
    path: "db/backup/import",
    timeout: DIALOG_TIMEOUT,
  });
};
