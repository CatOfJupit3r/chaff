import { createIcon } from './create-icon';

export const InboxIcon = createIcon(
  'InboxIcon',
  <>
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M5.5 5h13L20 13v6H4v-6z" />
  </>,
);
export const FocusIcon = createIcon(
  'FocusIcon',
  <>
    <rect x="5" y="6" width="14" height="14" rx="2.5" />
    <path d="M8 3h8" />
  </>,
);
export const DiffIcon = createIcon(
  'DiffIcon',
  <>
    <path d="M5 4h10l4 4v12H5z" />
    <path d="M9 11h6M12 8v6M9 17h6" />
  </>,
);
export const BranchIcon = createIcon(
  'BranchIcon',
  <>
    <circle cx="6" cy="5" r="2" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="8" r="2" />
    <path d="M6 7v10M18 10c0 5-6 3-12 7" />
  </>,
);
export const StackIcon = createIcon(
  'StackIcon',
  <>
    <circle cx="6" cy="5" r="2" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="6" cy="12" r="2" />
    <path d="M6 7v3M6 14v3M10 5h9M10 12h9M10 19h9" />
  </>,
);
export const DownIcon = createIcon('DownIcon', <path d="M6 9l6 6 6-6" />);
export const RightIcon = createIcon('RightIcon', <path d="M9 6l6 6-6 6" />);
export const CheckIcon = createIcon('CheckIcon', <path d="M5 12.5l4.5 4.5L19 7" />);
export const AlertIcon = createIcon(
  'AlertIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16v.5" />
  </>,
);
export const RefreshIcon = createIcon(
  'RefreshIcon',
  <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />,
);
export const ExternalIcon = createIcon(
  'ExternalIcon',
  <>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </>,
);
export const FolderIcon = createIcon(
  'FolderIcon',
  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />,
);
export const SunIcon = createIcon(
  'SunIcon',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);
export const CloseIcon = createIcon('CloseIcon', <path d="M6 6l12 12M18 6L6 18" />);
export const CopyIcon = createIcon(
  'CopyIcon',
  <>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </>,
);
export const SidebarIcon = createIcon(
  'SidebarIcon',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </>,
);
export const FileIcon = createIcon(
  'FileIcon',
  <>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
  </>,
);
export const SearchIcon = createIcon(
  'SearchIcon',
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </>,
);
export const LeftIcon = createIcon('LeftIcon', <path d="M15 6l-6 6 6 6" />);
export const MessageIcon = createIcon('MessageIcon', <path d="M5 5h14v10H10l-4 4v-4H5z" />);
export const NextIcon = createIcon('NextIcon', <path d="M5 12h13M13 6l6 6-6 6" />);
export const QuestionIcon = createIcon(
  'QuestionIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 16.5v.3" />
  </>,
);
export const ClockIcon = createIcon(
  'ClockIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const HistoryIcon = createIcon(
  'HistoryIcon',
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5v4h4" />
    <path d="M12 8v4.2l2.8 1.8" />
  </>,
);
export const PanelIcon = createIcon(
  'PanelIcon',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
  </>,
);
export const UndoIcon = createIcon(
  'UndoIcon',
  <>
    <path d="M9 14l-5-5 5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </>,
);
export const FlagIcon = createIcon(
  'FlagIcon',
  <>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </>,
);
export const ExportIcon = createIcon(
  'ExportIcon',
  <>
    <path d="M12 15V4" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M5 13v6h14v-6" />
  </>,
);
export const SparkIcon = createIcon(
  'SparkIcon',
  <>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />
  </>,
);
export const StopIcon = createIcon('StopIcon', <rect x="6.5" y="6.5" width="11" height="11" rx="2" />);
export const SettingsIcon = createIcon(
  'SettingsIcon',
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </>,
);
export const MergeIcon = createIcon(
  'MergeIcon',
  <>
    <circle cx="6" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M6 8v8M18 16V11a4 4 0 0 0-4-4H9" />
  </>,
);
export const EditIcon = createIcon(
  'EditIcon',
  <>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </>,
);
export const UpIcon = createIcon('UpIcon', <path d="M6 15l6-6 6 6" />);
export const SkipIcon = createIcon(
  'SkipIcon',
  <>
    <path d="M6 6l7 6-7 6z" />
    <path d="M17 6v12" />
  </>,
);
