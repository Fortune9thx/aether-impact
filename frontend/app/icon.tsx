import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0C0C0B",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 20,
            color: "#6EE7B7",
            fontWeight: 600,
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size },
  );
}
