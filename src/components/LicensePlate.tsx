import React from "react";
import validateSwedishRegPlate from "./plateUtils";

type Props = {
  value: string;
  setValue?: (v: string) => void;
  error?: string;
  setError?: (s: string) => void;
  editable?: boolean;
  compact?: boolean;
  width?: number;
  fontColor?: string;
};

const forbiddenWords = [
  "SEX",
  "XXX",
  "GAY",
  "FAN",
  "PKK",
  "FUL",
  "APA",
  "KUK",
  "BAJ",
  "PISS",
  "FITT",
  "HOR",
  "SUG",
  "ASS",
  "DUM",
  "IDIOT",
  "JÄV",
  "NAZI",
  "HITLER",
  "FUCK",
  "WTF",
];

// validation is provided by ../plateUtils

const formatDisplay = (v = "") => {
  const up = v.toUpperCase().replace(/\s/g, "");
  if (up.length <= 3) return up;
  return up.slice(0, 3) + " " + up.slice(3);
};

const PlateVisual: React.FC<{
  inner: React.ReactNode;
  containerHeight: number;
  plateWidth: number;
  leftStripWidth?: number;
}> = ({ inner, containerHeight, plateWidth, leftStripWidth = 22 }) => (
  <div
    className="plate-visual-root"
    style={{
      display: "inline-flex",
      alignItems: "center",
      width: plateWidth,
      height: containerHeight,
      boxSizing: "border-box",
    }}
  >
    <div
      className="plate-visual-outer"
      style={{ borderRadius: 4, padding: 0, background: "transparent" }}
    >
      <div
        className="plate-visual-inner"
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "#000",
          borderRadius: 4,
          padding: 2,
        }}
      >
        <div
          className="plate-left-strip"
          style={{
            width: leftStripWidth,
            background: "#143f77",
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            // padding: "4px 2px",
          }}
        >
          <div
            style={{
              width: Math.max(12, Math.floor(leftStripWidth * 1.1)),
              height: Math.max(12, Math.floor(leftStripWidth * 1.1)),
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const containerSize = Math.max(
                12,
                Math.floor(leftStripWidth * 0.85),
              );
              const dotSize = Math.max(2, Math.floor(leftStripWidth * 0.12));
              const radius = Math.max(
                3,
                Math.floor(containerSize / 2) - dotSize - 1,
              );
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: dotSize,
                    height: dotSize,
                    background: "#ffd400",
                    borderRadius: 999,
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}
            <div
              style={{
                width: Math.max(4, Math.floor(leftStripWidth * 0.28)),
                height: Math.max(4, Math.floor(leftStripWidth * 0.28)),
                borderRadius: 999,
                background: "#14456e",
              }}
            />
          </div>
          <div
            style={{
              color: "white",
              fontWeight: 800,
              fontSize: Math.max(8, Math.floor(leftStripWidth * 0.45)),
              marginTop: 0,
            }}
          >
            S
          </div>
        </div>

        <div
          className="plate-body"
          style={{
            background: "#eef0f2",
            border: "none",
            borderRadius: "0 6px 6px 0",
            minWidth: plateWidth - leftStripWidth - 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0",
          }}
        >
          {inner}
        </div>
      </div>
    </div>
  </div>
);

const LicensePlate: React.FC<Props> = ({
  value,
  setValue,
  error,
  setError,
  editable = false,
  compact = false,
  width,
  fontColor = "#000",
}) => {
  // Sizes: default and compact (scaled down) so different instances can match visually
  // Sizes: default and compact (scaled down) so different instances can match visually
  // Increase default height so the plate matches typical button heights (py-3).
  const containerHeight = compact ? 28 : 40;
  const defaultPlateWidth = compact ? 90 : 130;
  const plateWidth = width ?? defaultPlateWidth;
  const leftStripWidth = compact ? 20 : 26;

  if (!editable) {
    // Static display (identical to editable)
    return (
      <PlateVisual
        inner={
          <span
            style={{
              fontFamily: "Arial Black, sans-serif",
              fontSize: compact ? 12 : 18,
              color: fontColor,
              letterSpacing: compact ? "3px" : "0px",
              textTransform: "uppercase",
              textShadow: "0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            {formatDisplay(value)}
          </span>
        }
        containerHeight={containerHeight}
        plateWidth={plateWidth}
        leftStripWidth={leftStripWidth}
      />
    );
  }

  // Editable: input inside plate visual
  return (
    <PlateVisual
      inner={
          <input
          type="text"
          value={(value || "").replace(/\s/g, "").toUpperCase()}
          onChange={(e) => {
            if (!setValue) return;
            let raw = e.target.value.toUpperCase();
            raw = raw.replace(/[^A-Z0-9]/g, "");
            if (/[ÅÄÖ]/.test(raw)) return;
            if (raw.length > 6) raw = raw.slice(0, 6);
            let valid = true;
            for (let i = 0; i < raw.length; i++) {
              if (i < 3 && !/[A-Z]/.test(raw[i])) valid = false;
              if (i >= 3 && i < 5 && !/[0-9]/.test(raw[i])) valid = false;
              if (i === 5 && !/[0-9A-Z]/.test(raw[i])) valid = false;
            }
            if (!valid) return;
            const prefix = raw.slice(0, 3);
            if (prefix.length === 3 && forbiddenWords.includes(prefix)) {
              if (setError) setError("Otillåten kombination. Välj annan.");
              return;
            } else if (setError) {
              if (error === "Otillåten kombination. Välj annan.") setError("");
            }
            setValue(raw);
          }}
          onBlur={() => {
            if (!setError) return;
            if (value && !validateSwedishRegPlate(value))
              setError("Ogiltigt format. Exempel: ABC123 eller ABC12D");
          }}
          placeholder="ABC123"
          maxLength={6}
          style={{
            fontFamily: "Arial Black, sans-serif",
            fontSize: compact ? 12 : 18,
            lineHeight: 1,
            color: fontColor,
            textShadow: "0 1px 0 rgba(255,255,255,0.7)",
            width: "100%",
            display: "block",
            textAlign: "center",
            background: "transparent",
            outline: "none",
            border: "none",
            padding: 0,
            margin: 0,
            overflow: "visible",
          }}
        />
      }
      containerHeight={containerHeight}
      plateWidth={plateWidth}
      leftStripWidth={leftStripWidth}
    />
  );
};

export default LicensePlate;
