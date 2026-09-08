import { coverColors } from "../api";

export function Cover({ title, path, width = 58, height = 84, fontSize }: {
  title: string; path?: string; width?: number | string; height?: number | string; fontSize?: number;
}) {
  const [c1, c2] = coverColors(title || "?");
  const style: React.CSSProperties = {
    width, height,
    ...(fontSize ? { fontSize } : {}),
    ["--cv1" as any]: c1, ["--cv2" as any]: c2,
  };
  return (
    <div className={"cover" + (path ? "" : " noimg")} style={style}>
      {path ? <img src={path} alt={title} loading="lazy" /> : <span>{title}</span>}
    </div>
  );
}
