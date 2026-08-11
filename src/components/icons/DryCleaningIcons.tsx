import type { SVGProps } from "react";

/**
 * Dry-cleaning domain icons — the shapes lucide-react doesn't ship (hanger,
 * loaded garment rail, laundry tag). Same conventions as lucide so these drop
 * in alongside <Printer />, <ScanLine /> etc: 24x24 grid, currentColor stroke,
 * strokeWidth 2, round caps. Use lucide for anything generic.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function Icon({ size = 24, strokeWidth = 2, children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Wire coat hanger. The core garment motif. */
export function Hanger(props: IconProps) {
  return (
    <Icon {...props}>
      {/* hook */}
      <path d="M9.9 7.6a2.1 2.1 0 1 1 4.2 0" />
      {/* neck into the shoulder apex */}
      <path d="M12 7.6v2" />
      {/* shoulders + bottom bar */}
      <path d="M12 9.6 3.4 16.4h17.2z" />
    </Icon>
  );
}

/** Garments hanging on a conveyor rail — loaded slots. */
export function GarmentRail({ strokeWidth = 1.9, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      {/* rail */}
      <path d="M2 4h20" />
      {/* two garments, necks long enough that they read as hung hangers
          rather than bunting once this shrinks to ~18px */}
      <path d="M8 4v3.2M8 7.2 4.8 13h6.4z" />
      <path d="M16 4v3.2M16 7.2 12.8 13h6.4z" />
    </Icon>
  );
}

/** Rail being emptied — one garment left, unload arrow. */
export function RailUnload({ strokeWidth = 1.9, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      {/* rail */}
      <path d="M2 4.5h20" />
      {/* remaining garment */}
      <path d="M8 4.5v2.2M8 6.7 5.1 11.4h5.8z" />
      {/* empty hook, garment already pulled */}
      <path d="M16.5 4.5v2.2" />
      {/* unload arrow */}
      <path d="M16.5 11v8M13.2 15.7l3.3 3.3 3.3-3.3" />
    </Icon>
  );
}

/** Laundry tag with barcode — the number an operator keys in by hand. */
export function LaundryTag(props: IconProps) {
  return (
    <Icon {...props}>
      {/* tag body, notched left edge */}
      <path d="M8 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-5-8z" />
      {/* string eyelet — lighter stroke so it stays a ring, not a blob */}
      <circle cx="7.8" cy="12" r="1.2" strokeWidth={1.5} />
      {/* barcode — thin and spaced, otherwise the bars merge into a slab */}
      <path d="M12.4 8.6v6.8M15.2 8.6v6.8M18 8.6v6.8" strokeWidth={1.5} />
    </Icon>
  );
}
