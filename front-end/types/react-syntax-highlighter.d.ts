declare module "react-syntax-highlighter" {
    // Minimal typing to satisfy TypeScript without pulling in full @types.
    import * as React from "react";

    export interface SyntaxHighlighterProps {
        language?: string;
        style?: unknown;
        children?: React.ReactNode;
        showLineNumbers?: boolean;
        wrapLines?: boolean;
        wrapLongLines?: boolean;
        customStyle?: React.CSSProperties;
        codeTagProps?: React.HTMLAttributes<HTMLElement>;
    }

    export const Prism: React.ComponentType<SyntaxHighlighterProps>;
    export const Light: React.ComponentType<SyntaxHighlighterProps>;

    const DefaultExport: React.ComponentType<SyntaxHighlighterProps>;
    export default DefaultExport;
}

declare module "react-syntax-highlighter/dist/esm/styles/hljs" {
    // Minimal style typings; we only need atomOneLight in this project.
    export const atomOneLight: unknown;

    const styles: Record<string, unknown>;
    export default styles;
}

