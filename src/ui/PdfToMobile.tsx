import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Progress,
  Segmented,
  Select,
  Slider,
  Space,
  Switch,
  theme,
  Typography,
  Upload,
} from "antd";
import { InboxOutlined, MobileOutlined, DownloadOutlined } from "@ant-design/icons";
import { saveAs } from "file-saver";
import { convertPdf, type ConvertPdfConfig } from "../engine/convertPdf.js";
import type { ConvertOptions } from "../engine/flags.js";
import type { EngineSource } from "../engine/protocol.js";
import { zh, type Messages } from "./messages.js";

type ConvertFn = (input: Uint8Array, opts: ConvertOptions) => Promise<Uint8Array>;

export interface PdfToMobileProps {
  /** message dictionary (default: zh) */
  messages?: Messages;
  /** override the conversion function (tests inject a mock) */
  convert?: ConvertFn;
  /** config for the default convertPdf (worker factory, module URL) */
  engineConfig?: ConvertPdfConfig;
  /** show the built-in title/subtitle. Off when the host page provides its own hero. */
  showHeader?: boolean;
}

type Phase = "idle" | "busy" | "done" | "error";

/** Which description line to show for the currently-selected layout mode. */
const LAYOUT_DESC: Record<"magnify" | "hybrid" | "preserve" | "reflow", keyof Messages> = {
  magnify: "descMagnify",
  hybrid: "descHybrid",
  preserve: "descPreserve",
  reflow: "descReflow",
};

/** Bytes → "12.3 MB", for the engine download counter. */
const fmtMB = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export function PdfToMobile({ messages = zh, convert, engineConfig, showHeader = true }: PdfToMobileProps) {
  const t = useCallback((k: keyof Messages) => messages[k], [messages]);
  // The preview frame is the one place the converter paints its own surface, so it
  // takes its hairline and radius from the theme rather than raw values.
  const { token } = theme.useToken();

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pct, setPct] = useState(0);
  const [engine, setEngine] = useState<{ loaded: number; total: number; source: EngineSource } | null>(null);
  const [errorKey, setErrorKey] = useState<
    "errEncrypted" | "errGeneric" | "errNoFile" | "errTooLarge" | null
  >(null);
  const [result, setResult] = useState<{ url: string; size: number; name: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [layout, setLayout] = useState<"magnify" | "preserve" | "reflow" | "hybrid">("magnify");
  const [device, setDevice] = useState<"phone" | "tablet">("phone");
  const [columns, setColumns] = useState<1 | 2 | "auto">("auto");
  const [fontScale, setFontScale] = useState(1);
  const [trimMargins, setTrimMargins] = useState(true);

  const convertFn: ConvertFn = useMemo(
    () => convert ?? ((input, opts) => convertPdf(input, opts, engineConfig)),
    [convert, engineConfig],
  );

  // Track the live object URL so we can revoke it on unmount (avoids a blob leak
  // if the component unmounts while a result is shown). A conversion that is
  // still running when the host unmounts gets aborted with it.
  const resultUrlRef = useRef<string | null>(null);
  resultUrlRef.current = result?.url ?? null;
  const abortRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [],
  );

  const reset = () => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setPhase("idle");
    setPct(0);
    setEngine(null);
    setErrorKey(null);
    setNotice(null);
  };

  const onCancel = useCallback(() => abortRef.current?.abort(), []);

  const onConvert = useCallback(async () => {
    if (!file) {
      setErrorKey("errNoFile");
      setPhase("error");
      return;
    }
    // 32-bit wasm heap is limited; reject oversized input before loading it in.
    if (file.size > 100 * 1024 * 1024) {
      setErrorKey("errTooLarge");
      setPhase("error");
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("busy");
    setPct(0);
    setEngine(null);
    setErrorKey(null);
    setNotice(null);
    try {
      const input = new Uint8Array(await file.arrayBuffer());
      const opts: ConvertOptions = {
        layout,
        device,
        columns,
        fontScale,
        trimMargins,
        signal: ac.signal,
        onEngineProgress: ({ loaded, total, source }) => setEngine({ loaded, total, source }),
        onProgress: ({ page, total }) =>
          setPct(total > 0 ? Math.min(99, Math.round((page / total) * 100)) : 0),
        onNotice: (code) => {
          if (code === "noTextLayerFallback") setNotice(t("noticeNoTextLayer"));
        },
      };
      const out = await convertFn(input, opts);
      setPct(100);
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const name = file.name.replace(/\.pdf$/i, "") + "-mobile.pdf";
      // Re-converting (e.g. after tweaking a layout option) replaces the result;
      // revoke the previous blob URL so it doesn't leak.
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      setResult({ url, size: out.byteLength, name });
      setPhase("done");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // The worker died with its half-fetched engine, so nothing partial stuck.
        setPhase("idle");
        setNotice(t("cancelled"));
        return;
      }
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      setErrorKey(/password|encrypt/.test(msg) ? "errEncrypted" : "errGeneric");
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }, [file, layout, device, columns, fontScale, trimMargins, convertFn, t]);

  // One status line while busy: engine bytes first (they dominate a first run),
  // then page progress.
  const statusLine =
    pct > 0
      ? `${t("converting")} ${pct}%`
      : !engine
        ? `${t("converting")}…`
        : engine.source === "cache"
          ? t("engineReadyFromCache")
          : engine.total > engine.loaded
            ? `${t("loadingEngine")} ${fmtMB(engine.loaded)} / ${fmtMB(engine.total)}`
            : `${t("loadingEngine")} ${fmtMB(engine.loaded)}`;

  return (
    <Card variant="borderless" className="rp-converter" style={{ margin: "0 auto" }}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {showHeader && (
          <div>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              <MobileOutlined /> {t("title")}
            </Typography.Title>
            <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
          </div>
        )}

        <Upload.Dragger
          accept="application/pdf,.pdf"
          multiple={false}
          maxCount={1}
          beforeUpload={(f) => {
            setFile(f as unknown as File);
            reset();
            return false; // prevent auto-upload; we process locally
          }}
          onRemove={() => {
            setFile(null);
            reset();
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t("dragHint")}</p>
          <p className="ant-upload-hint">{t("dragHintSub")}</p>
        </Upload.Dragger>

        <div>
          <Space wrap align="center">
            <Typography.Text strong>{t("layout")}</Typography.Text>
            <Segmented
              value={layout}
              onChange={(v) => setLayout(v as "magnify" | "preserve" | "reflow" | "hybrid")}
              options={[
                { label: t("layoutMagnify"), value: "magnify" },
                { label: t("layoutHybrid"), value: "hybrid" },
                { label: t("layoutPreserve"), value: "preserve" },
                { label: t("layoutReflow"), value: "reflow" },
              ]}
            />
          </Space>
          <Typography.Paragraph className="rp-desc" type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {t(LAYOUT_DESC[layout])}
          </Typography.Paragraph>
          <Typography.Paragraph className="rp-note" type="secondary" style={{ marginTop: 10, marginBottom: 0 }}>
            {t("layoutComplexNote")}
          </Typography.Paragraph>
        </div>

        <Collapse
          ghost
          items={[
            {
              key: "adv",
              label: t("advanced"),
              children: (
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                  <Space wrap>
                    <Typography.Text>{t("device")}</Typography.Text>
                    <Segmented
                      value={device}
                      onChange={(v) => setDevice(v as "phone" | "tablet")}
                      options={[
                        { label: t("devicePhone"), value: "phone" },
                        { label: t("deviceTablet"), value: "tablet" },
                      ]}
                    />
                  </Space>
                  {layout === "reflow" && (
                    <>
                      <Space wrap>
                        <Typography.Text>{t("columns")}</Typography.Text>
                        <Select
                          value={columns}
                          style={{ width: 160 }}
                          onChange={(v) => setColumns(v)}
                          options={[
                            { label: t("colAuto"), value: "auto" },
                            { label: t("col1"), value: 1 },
                            { label: t("col2"), value: 2 },
                          ]}
                        />
                      </Space>
                      <div>
                        <Typography.Text>{t("fontScale")}: {fontScale.toFixed(1)}×</Typography.Text>
                        <Slider min={0.6} max={2} step={0.1} value={fontScale} onChange={setFontScale} />
                      </div>
                      <Space>
                        <Switch checked={trimMargins} onChange={setTrimMargins} />
                        <Typography.Text>{t("trimMargins")}</Typography.Text>
                      </Space>
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />

        <div data-testid="convert-btn">
          <Button
            type="primary"
            size="large"
            block
            loading={phase === "busy"}
            onClick={onConvert}
            disabled={!file && phase !== "error"}
          >
            {phase === "busy" ? `${t("converting")}…` : t("convert")}
          </Button>
        </div>

        {phase === "busy" && (
          <Space orientation="vertical" size="small" style={{ width: "100%" }}>
            <Typography.Text type="secondary" data-testid="status-line">
              {statusLine}
            </Typography.Text>
            {/* The bar counts pages, so it stays hidden until the first page
                lands — a 0% bar next to a download counter reads as stuck. */}
            {pct > 0 && <Progress percent={pct} status="active" />}
            <div data-testid="cancel-btn">
              <Button size="small" onClick={onCancel}>
                {t("cancel")}
              </Button>
            </div>
          </Space>
        )}

        {phase === "error" && errorKey && (
          <Alert type="error" showIcon title={t(errorKey)} />
        )}

        {notice && phase !== "busy" && <Alert type="info" showIcon title={notice} />}

        {phase === "done" && result && (
          <Card size="small" title={t("resultTitle")}>
            <Space orientation="vertical" style={{ width: "100%" }} size="middle">
              <iframe
                title={t("previewTitle")}
                src={result.url}
                className="rp-preview"
                style={{
                  width: "100%",
                  height: 420,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusSM,
                }}
              />
              <div data-testid="download-btn">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => saveAs(result.url, result.name)}
                >
                  {t("download")} (
                {result.size >= 1024 * 1024
                  ? `${(result.size / 1024 / 1024).toFixed(1)} MB`
                  : `${Math.max(1, Math.round(result.size / 1024))} KB`}
                )
                </Button>
              </div>
            </Space>
          </Card>
        )}

        <span className="rp-priv"><i className="r" />{t("privacy")}</span>
      </Space>
    </Card>
  );
}

export default PdfToMobile;
