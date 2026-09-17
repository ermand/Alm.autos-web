import { photoSrc, photoSrcSet, VARIANT_WIDTHS } from "~/domain/photos.ts";
import type { Vehicle } from "~/domain/vehicle.ts";
import { cardPhoto, vehicleTitle } from "~/domain/vehicle.ts";

interface Props {
  vehicle: Vehicle;
  /** Rendered width hint for the browser, e.g. "(min-width: 768px) 33vw, 100vw". */
  sizes: string;
  className?: string;
  priority?: boolean;
}

/**
 * A vehicle's card image. Vehicles with no photo yet render a neutral plate
 * rather than a broken image — the fleet launches partially documented.
 */
export function VehicleCardPhoto({ vehicle, sizes, className, priority }: Props) {
  const photo = cardPhoto(vehicle);

  if (!photo) {
    return (
      <div
        className={`flex items-center justify-center bg-sand-200 text-ink-500 ${className ?? ""}`}
        aria-hidden="true"
      >
        <span className="font-display text-lg">{vehicle.model}</span>
      </div>
    );
  }

  return (
    <img
      src={photoSrc(photo.path, 800)}
      srcSet={photoSrcSet(photo.path)}
      sizes={sizes}
      width={VARIANT_WIDTHS[1]}
      height={Math.round((VARIANT_WIDTHS[1] * 3) / 4)}
      alt={vehicleTitle(vehicle)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
