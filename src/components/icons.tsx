const paths: Record<string, string> = {
  folder: "M3 6a1 1 0 0 1 1-1h4.5l1.5 2H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z",
  note: "M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 1v5h5",
  "folder-plus": "M3 6a1 1 0 0 1 1-1h4.5l1.5 2H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Zm9 4v5m-2.5-2.5h5",
  "note-plus": "M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 12h8m-4-4v8",
  rename: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z",
  move: "M3 6a1 1 0 0 1 1-1h4.5l1.5 2H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Zm7 6h6m0 0-2.5-2.5M16 12l-2.5 2.5",
  trash: "M5 7h14m-9 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3m4 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7Z",
  sun: "M12 4V2m0 20v-2M4 12H2m20 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  moon: "M20.5 14.5a8.5 8.5 0 1 1-9-11 7 7 0 0 0 9 11Z",
  commands: "M8 9 4.5 12 8 15m8-6 3.5 3-3.5 3m-4-9-2 12",
  close: "m5 5 14 14M19 5 5 19",
  "chevron-up": "m6 15 6-6 6 6",
  "chevron-down": "m6 9 6 6 6-6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-5.5-5.5",
  workspace: "M4 4h7v7H4V4Zm9 0h7v4h-7V4Zm0 7h7v9h-7v-9ZM4 14h7v7H4v-7Z",
  sync: "M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0 0 14.5 3.5M19.5 9A8 8 0 0 0 5 5.5",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a7.9 7.9 0 0 0-.2-1.8l2-1.6-2-3.4-2.4 1a8 8 0 0 0-3.1-1.8L14 2h-4l-.3 2.4a8 8 0 0 0-3.1 1.8l-2.4-1-2 3.4 2 1.6a7.9 7.9 0 0 0 0 3.6l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 3.1 1.8L10 22h4l.3-2.4a8 8 0 0 0 3.1-1.8l2.4 1 2-3.4-2-1.6c.13-.6.2-1.2.2-1.8Z",
  "git-branch": "M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 4v10m12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 0v3a4 4 0 0 1-4 4H8m-2 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  "window-minimize": "M5 19h14",
  "window-maximize": "M5 5h14v14H5V5Z",
  "window-restore": "M8 8h11v11H8V8Zm-3-3h11v3H8v8H5V5Z",
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
