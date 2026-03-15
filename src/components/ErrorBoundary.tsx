import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: "#0a0a0f", color: "#f1f5f9", height: "100vh",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", fontFamily: "monospace", padding: "40px",
          gap: "16px"
        }}>
          <div style={{ color: "rgb(var(--accent-300))", fontSize: "24px", fontWeight: "bold" }}>ZGameLib — Startup Error</div>
          <div style={{ color: "#ef4444", fontSize: "14px", maxWidth: "700px", wordBreak: "break-all" }}>
            {this.state.error.message}
          </div>
          <pre style={{
            background: "#111118", border: "1px solid #1e1e2e", borderRadius: "8px",
            padding: "16px", fontSize: "11px", color: "#94a3b8", overflow: "auto",
            maxWidth: "800px", maxHeight: "300px", width: "100%"
          }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "rgb(var(--accent-600))", color: "white", border: "none",
              borderRadius: "10px", padding: "10px 24px", cursor: "pointer", fontSize: "14px"
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
