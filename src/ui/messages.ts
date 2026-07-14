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
  | "layoutHybrid"
  | "descMagnify"
  | "descHybrid"
  | "descPreserve"
  | "descReflow"
  | "layoutComplexNote"
  | "noticeNoTextLayer"
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
  | "footerNote"
  | "errEncrypted"
  | "errGeneric"
  | "errNoFile"
  | "errTooLarge";

export type Messages = Record<MsgKey, string>;

export const zh: Messages = {
  title: "PDF 转手机版",
  subtitle: "把电脑版式的 PDF 放大 / 重排成适合手机竖屏阅读的版式",
  privacy: "文件不上传，全部在你的浏览器本地处理。",
  dragHint: "点击或拖拽 PDF 到此处",
  dragHintSub: "论文、报告等文字类 PDF 都适用；首次加载引擎约需几秒",
  convert: "转换为手机版",
  converting: "转换中",
  layout: "排版方式",
  layoutMagnify: "放大阅读",
  layoutPreserve: "保留原版式",
  layoutReflow: "重排文字",
  layoutHybrid: "智能混合",
  // Per-mode descriptions — only the selected mode's line is shown.
  descMagnify:
    "保留原图文与颜色，自动识别栏目、每栏放大成一页。图 / 表 / 公式整块放大、不打散，阅读顺序不变。适合多栏或带图表的论文。",
  descHybrid:
    "在「放大阅读」之上，把全宽的标题 / 摘要也转成大字，双栏正文仍保矢量。适合页内单双混合的论文。仅电子版 PDF；扫描件自动退回「放大阅读」。",
  descPreserve:
    "一页对一页，整页缩到手机宽，矢量 + 彩色、最忠实——但字偏小。适合在手机上忠实预览原版面。",
  descReflow:
    "把文字重排成单栏大字，最大、最好读；但会栅格化、丢色、打散版面，复杂表格可能变乱。仅适合纯文字长文。",
  layoutComplexNote:
    "提示：本工具是「放大」而非「重排」表格 / 公式——宽表格不会被重排成手机竖版；全程本地、文件不上传。",
  noticeNoTextLayer: "此文档无文字层（可能是扫描件），已按「放大阅读」处理。",
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
  footerNote: "纯浏览器本地转换，文件不上传 · 引擎 k2pdfopt(WASM)",
  errEncrypted: "这个 PDF 已加密，请先解除密码再试。",
  errGeneric: "转换失败，请换一个文件或稍后重试。",
  errNoFile: "请先选择一个 PDF 文件。",
  errTooLarge: "文件太大,可能超出浏览器内存。请用更小的 PDF(建议 < 100MB)。",
};

export const en: Messages = {
  title: "PDF to Mobile",
  subtitle: "Enlarge / reflow a desktop-layout PDF into a phone-friendly portrait layout",
  privacy: "Files never leave your device — everything runs locally in your browser.",
  dragHint: "Click or drag a PDF here",
  dragHintSub: "Works for papers, reports and other text PDFs; the engine takes a few seconds to load the first time",
  convert: "Convert for mobile",
  converting: "Converting",
  layout: "Layout",
  layoutMagnify: "Magnify",
  layoutPreserve: "Preserve layout",
  layoutReflow: "Reflow text",
  layoutHybrid: "Smart hybrid",
  // Per-mode descriptions — only the selected mode's line is shown.
  descMagnify:
    "Keeps the original text, colors and figures; auto-detects columns and enlarges each onto its own page. Figures, tables and equations are enlarged as intact blocks, reading order preserved. Best for multi-column or figure-heavy papers.",
  descHybrid:
    "Like Magnify, but full-width titles/abstracts are turned into big text while the two-column body stays vector. Best for pages that mix single and two columns. Born-digital PDFs only; scans fall back to Magnify.",
  descPreserve:
    "One page each, the whole page scaled to phone width — vector + color, most faithful, but text stays small. Best for a faithful on-phone preview.",
  descReflow:
    "Reflows text into a single big-text column — biggest and most readable, but rasterizes, drops color and breaks the layout; complex tables may garble. Plain prose only.",
  layoutComplexNote:
    "Note: this tool magnifies rather than re-typesetting — wide tables/equations aren't rebuilt into a mobile layout — and your file is never uploaded.",
  noticeNoTextLayer: "No text layer (likely a scan) — processed as ‘Magnify’ instead.",
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
  footerNote: "100% in-browser conversion, nothing uploaded · engine: k2pdfopt (WASM)",
  errEncrypted: "This PDF is encrypted — please remove the password and try again.",
  errGeneric: "Conversion failed. Try another file or again later.",
  errNoFile: "Please choose a PDF file first.",
  errTooLarge: "File is too large and may exceed browser memory. Try a smaller PDF (< 100MB).",
};
