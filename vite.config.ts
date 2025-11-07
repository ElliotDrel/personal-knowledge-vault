import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { componentTagger } from "lovable-tagger";

const chunkForPackage = (id: string) => {
  if (!id.includes("node_modules")) {
    return null;
  }

  const parts = id.split("node_modules/")[1]?.split("/") ?? [];
  if (parts.length === 0) {
    return "vendor";
  }

  const scope = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];

  if (scope === "react" || scope === "react-dom" || scope === "scheduler") {
    return "react";
  }

  if (scope.startsWith("@radix-ui")) {
    return "radix";
  }

  if (scope.startsWith("@tanstack")) {
    return "query";
  }

  if (scope === "recharts") {
    return "charts";
  }

  if (scope === "lucide-react") {
    return "icons";
  }

  if (scope === "@uiw/react-md-editor") {
    return "md-editor";
  }

  if (scope === "sonner") {
    return "toast";
  }

  if (
    scope === "marked" ||
    scope === "turndown" ||
    scope === "react-markdown" ||
    scope === "remark-gfm" ||
    scope === "rehype-sanitize" ||
    scope.startsWith("unist-") ||
    scope.startsWith("hast-") ||
    scope.startsWith("mdast-")
  ) {
    return "markdown";
  }

  if (scope === "refractor") {
    return "syntax";
  }


  return "vendor";
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isAnalyze = mode === "analyze";

  return {
    server: {
      host: "::",
      port: 2222,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      isAnalyze &&
        visualizer({
          filename: "dist/bundle-report.html",
          template: "treemap",
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            return chunkForPackage(id);
          },
        },
      },
    },
  };
});


