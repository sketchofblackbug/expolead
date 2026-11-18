import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e3a8a",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 108,
            gap: 10,
          }}
        >
          <div style={{ width: 48, height: 48, background: "#fff", borderRadius: 10 }} />
          <div style={{ width: 48, height: 48, background: "#fff", borderRadius: 10 }} />
          <div style={{ width: 48, height: 48, background: "#fff", borderRadius: 10 }} />
          <div
            style={{
              width: 48,
              height: 48,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <div style={{ width: 21, height: 21, background: "#10b981", borderRadius: 4 }} />
            <div style={{ width: 21, height: 21, background: "#fff", borderRadius: 4 }} />
            <div style={{ width: 21, height: 21, background: "#fff", borderRadius: 4 }} />
            <div style={{ width: 21, height: 21, background: "#10b981", borderRadius: 4 }} />
          </div>
        </div>
      </div>
    ),
    size
  );
}
