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
  Typography,
  Upload,
} from "antd";
import { InboxOutlined, MobileOutlined, DownloadOutlined } from "@ant-design/icons";
import { saveAs } from "file-saver";
import { convertPdf, type ConvertPdfConfig } from "../engine/convertPdf.js";
import type { ConvertOptions } from "../engine/flags.js";
import { zh, type Messages } from "./messages.js";

type ConvertFn = (input: Uint8Array, opts: ConvertOptions) => Promise<Uint8Array>;

export interface PdfToMobileProps {
  /** message dictionary (default: zh) */
  messages?: Messages;
  /** override the conversion function (tests inject a mock) */
  convert?: ConvertFn;
  /** config for the default convertPdf (worker factory, module URL) */
  engineConfig?: ConvertPdfConfig;
}

type Phase = "idle" | "busy" | "done" | "error";

export function PdfToMobile({ messages = zh, convert, engineConfig }: PdfToMobileProps) {
  const t = useCallback((k: keyof Messages) => messages[k], [messages]);

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pct, setPct] = useState(0);
  const [errorKey, setErrorKey] = useState<
    "errEncrypted" | "errGeneric" | "errNoFile" | "errTooLarge" | null
  >(null);
  const [result, setResult] = useState<{ url: string; size: number; name: string } | null>(null);

  const [layout, setLayout] = useState<"magnify" | "preserve" | "reflow">("magnify");
  const [device, setDevice] = useState<"phone" | "tablet">("phone");
  const [columns, setColumns] = useState<1 | 2 | "auto">("auto");
  const [fontScale, setFontScale] = useState(1);
  const [trimMargins, setTrimMargins] = useState(true);

  const convertFn: ConvertFn = useMemo(
    () => convert ?? ((input, opts) => convertPdf(input, opts, engineConfig)),
    [convert, engineConfig],
  );

  // Track the live object URL so we can revoke it on unmount (avoids a blob leak
  // if the component unmounts while a result is shown).
  const resultUrlRef = useRef<string | null>(null);
  resultUrlRef.current = result?.url ?? null;
  useEffect(
    () => () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [],
  );

  const reset = () => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setPhase("idle");
    setPct(0);
    setErrorKey(null);
  };

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
    setPhase("busy");
    setPct(0);
    setErrorKey(null);
    try {
      const input = new Uint8Array(await file.arrayBuffer());
      const opts: ConvertOptions = {
        layout,
        device,
        columns,
        fontScale,
        trimMargins,
        onProgress: ({ page, total }) =>
          setPct(total > 0 ? Math.min(99, Math.round((page / total) * 100)) : 0),
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
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      setErrorKey(/password|encrypt/.test(msg) ? "errEncrypted" : "errGeneric");
      setPhase("error");
    }
  }, [file, layout, device, columns, fontScale, trimMargins, convertFn]);

  return (
    <Card variant="borderless" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            <MobileOutlined /> {t("title")}
          </Typography.Title>
          <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
        </div>

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
              onChange={(v) => setLayout(v as "magnify" | "preserve" | "reflow")}
              options={[
                { label: t("layoutMagnify"), value: "magnify" },
                { label: t("layoutPreserve"), value: "preserve" },
                { label: t("layoutReflow"), value: "reflow" },
              ]}
            />
          </Space>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
            {t("layoutHint")}
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

        {phase === "busy" && <Progress percent={pct} status="active" />}

        {phase === "error" && errorKey && (
          <Alert type="error" showIcon title={t(errorKey)} />
        )}

        {phase === "done" && result && (
          <Card size="small" title={t("resultTitle")}>
            <Space orientation="vertical" style={{ width: "100%" }} size="middle">
              <iframe
                title="preview"
                src={result.url}
                style={{ width: "100%", height: 420, border: "1px solid #eee", borderRadius: 8 }}
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

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          🔒 {t("privacy")}
        </Typography.Text>
      </Space>
    </Card>
  );
}

export default PdfToMobile;
