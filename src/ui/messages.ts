/** UI strings for PdfToMobile. zh is the default; en mirrors the same keys. */
export type MsgKey =
  | "title"
  | "subtitle"
  | "privacy"
  | "dragHint"
  | "dragHintSub"
  | "convert"
  | "converting"
  | "layout"
  | "layoutMagnify"
  | "layoutPreserve"
  | "layoutReflow"
  | "layoutHint"
  | "advanced"
  | "device"
  | "devicePhone"
  | "deviceTablet"
  | "columns"
  | "colAuto"
  | "col1"
  | "col2"
  | "fontScale"
  | "trimMargins"
  | "download"
  | "resultTitle"
  | "errEncrypted"
  | "errGeneric"
  | "errNoFile"
  | "errTooLarge";

export type Messages = Record<MsgKey, string>;

export const zh: Messages = {
  title: "PDF 转手机版",
  subtitle: "把 PC 版式的 PDF 重排成适合手机竖屏阅读的 PDF",
  privacy: "文件不上传，全部在你的浏览器本地处理。",
  dragHint: "点击或拖拽 PDF 到此处",
  dragHintSub: "适合文字为主的商业文档；首次加载引擎约需几秒",
  convert: "转换为手机版",
  converting: "转换中",
  layout: "排版方式",
  layoutMagnify: "放大阅读",
  layoutPreserve: "保留原版式",
  layoutReflow: "重排文字",
  layoutHint:
    "默认「放大阅读」：保留颜色与版面，自动把多栏/并排区域拆成放大的页，字更大。「保留原版式」：一页对一页最忠实，但字偏小。「重排文字」：字最大但会打散版面，仅适合纯文字。",
  advanced: "高级选项",
  device: "目标设备",
  devicePhone: "手机（竖屏）",
  deviceTablet: "平板",
  columns: "分栏",
  colAuto: "自动检测",
  col1: "强制单栏",
  col2: "强制双栏",
  fontScale: "字号缩放",
  trimMargins: "去除白边",
  download: "下载手机版 PDF",
  resultTitle: "转换完成",
  errEncrypted: "这个 PDF 已加密，请先解除密码再试。",
  errGeneric: "转换失败，请换一个文件或稍后重试。",
  errNoFile: "请先选择一个 PDF 文件。",
  errTooLarge: "文件太大,可能超出浏览器内存。请用更小的 PDF(建议 < 100MB)。",
};

export const en: Messages = {
  title: "PDF to Mobile",
  subtitle: "Reflow a PC-layout PDF into a phone-friendly, portrait PDF",
  privacy: "Files never leave your device — everything runs locally in your browser.",
  dragHint: "Click or drag a PDF here",
  dragHintSub: "Best for text-heavy business docs; the engine takes a few seconds to load",
  convert: "Convert for mobile",
  converting: "Converting",
  layout: "Layout",
  layoutMagnify: "Magnify",
  layoutPreserve: "Preserve layout",
  layoutReflow: "Reflow text",
  layoutHint:
    "Default ‘Magnify’ keeps colors/layout and splits columns into larger pages for bigger text. ‘Preserve layout’ is most faithful (one page each), but text stays small. ‘Reflow text’ gives the biggest type but breaks layout — plain prose only.",
  advanced: "Advanced options",
  device: "Target device",
  devicePhone: "Phone (portrait)",
  deviceTablet: "Tablet",
  columns: "Columns",
  colAuto: "Auto-detect",
  col1: "Force single column",
  col2: "Force two columns",
  fontScale: "Font scale",
  trimMargins: "Trim white margins",
  download: "Download mobile PDF",
  resultTitle: "Done",
  errEncrypted: "This PDF is encrypted — please remove the password and try again.",
  errGeneric: "Conversion failed. Try another file or again later.",
  errNoFile: "Please choose a PDF file first.",
  errTooLarge: "File is too large and may exceed browser memory. Try a smaller PDF (< 100MB).",
};
