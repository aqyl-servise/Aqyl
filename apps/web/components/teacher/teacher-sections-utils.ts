export function fmLabels(t: Record<string, string>) {
  return {
    home: t.fm_home, newFolder: t.fm_new_folder, upload: t.fm_upload,
    uploading: t.fm_uploading, search: t.fm_search, folderName: t.fm_folder_name,
    create: t.fm_create, cancel: t.cancel, noFiles: t.fm_no_files,
    download: t.fm_download, delete: t.fm_delete, loading: t.loading,
    sort: t.fm_sort, sortDate: t.fm_sort_date, sortName: t.fm_sort_name,
    sortAuthor: t.fm_sort_author, pin: t.fm_pin, unpin: t.fm_unpin,
  };
}
