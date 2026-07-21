import { CodeBlock } from "./CodeBlock";

type Props = {
  /** basename under /public/charts, without theme suffix or extension */
  name: string;
  alt: string;
  caption?: string;
  /** optional python snippet shown under the image */
  code?: string;
  /** constrain width (e.g. for tall/narrow charts) */
  className?: string;
};

/**
 * Renders a matplotlib chart rendered in both edgekit themes. The light PNG shows
 * in light mode, the dark PNG in dark mode (CSS-swapped) so the chart always looks
 * native. Images live at /public/charts/<name>.<light|dark>.png (2x DPI).
 */
export function ChartFigure({ name, alt, caption, code, className = "" }: Props) {
  return (
    <figure className={`my-6 overflow-hidden rounded-xl border border-border bg-surface ${className}`}>
      <div className="bg-white p-1 dark:bg-[#0d1117]">
        <img
          src={`/charts/${name}.light.png`}
          alt={alt}
          loading="lazy"
          className="mx-auto block h-auto w-full max-w-full dark:hidden"
        />
        <img
          src={`/charts/${name}.dark.png`}
          alt={alt}
          loading="lazy"
          className="mx-auto hidden h-auto w-full max-w-full dark:block"
        />
      </div>
      {caption && (
        <figcaption className="border-t border-border px-4 py-2 text-xs text-muted">{caption}</figcaption>
      )}
      {code && (
        <div className="border-t border-border">
          <CodeBlock code={code} />
        </div>
      )}
    </figure>
  );
}
