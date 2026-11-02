import { SVGProps, useId } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  secondaryfill?: string;
  strokewidth?: number;
  title?: string;
  useGradient?: boolean;
};

export function ArgosLogo({
  fill = "currentColor",
  secondaryfill,
  useGradient = true,
  ...props
}: IconProps) {
  const gradientId = useId();
  const fillSource = useGradient ? `url(#${gradientId})` : fill;

  return (
    <svg
      viewBox="0 0 96 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="color-mix(in srgb, var(--primary) 70%, var(--foreground))" />
        </linearGradient>
      </defs>
      <path
        d="M 1.5 69.5 L 37.8 7.5 C 41.5 1.5 49.5 0.5 53.5 6.5 L 94.5 69.5 C 95.5 71 94.5 71.5 93 71.5 L 72.5 71.5 C 71.2 71.5 70.2 70.8 69.5 69.8 L 48.5 28 C 47.8 26.8 46.2 26.8 45.5 28 L 33 53.5 L 53 55.5 C 54.2 55.6 54.8 56.8 54.2 57.8 L 44 70 C 43.2 71 42 71.5 40.5 71.5 L 2 71.5 C 0.8 71.5 -0.2 70.5 0.5 69.5 Z"
        fill={fillSource}
      />
    </svg>
  );
}

export default ArgosLogo;
