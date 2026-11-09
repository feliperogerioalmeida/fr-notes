"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const GlobalError = ({ reset }: GlobalErrorProps) => {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1rem",
          backgroundColor: "#fafafa",
          color: "#171717",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#737373",
            margin: 0,
            maxWidth: "24rem",
            textAlign: "center",
          }}
        >
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e5e5",
            background: "transparent",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
};

export default GlobalError;
