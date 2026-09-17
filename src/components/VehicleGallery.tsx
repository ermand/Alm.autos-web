import { useState } from "react";
import { photoSrc, photoSrcSet } from "~/domain/photos.ts";
import { type Vehicle, vehicleTitle } from "~/domain/vehicle.ts";
import { type Locale, messagesFor } from "~/i18n/messages.ts";

interface Props {
  vehicle: Vehicle;
  locale: Locale;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

/**
 * A vehicle's photos.
 *
 * The thumbnails used to be plain images, so a visitor could click one and
 * nothing happened — worse than not showing them, and a regression from the old
 * site, which at least opened a full-size view. They are buttons now.
 *
 * The caller keys this on the vehicle id, so moving to another car remounts it
 * and the selected photo resets without an effect watching for the change.
 */
export function VehicleGallery({ vehicle, locale }: Props) {
  const t = messagesFor(locale);
  const photos = vehicle.photos;
  const [index, setIndex] = useState(0);

  const current = photos[Math.min(index, photos.length - 1)];

  if (!current) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-sand-100 text-ink-500">
        <span className="font-display text-xl">{vehicle.model}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <figure className="relative">
        <img
          key={current.id}
          src={photoSrc(current.path, 1600)}
          srcSet={photoSrcSet(current.path)}
          sizes="(min-width: 1024px) 700px, 92vw"
          alt={
            photos.length > 1
              ? `${vehicleTitle(vehicle)} — ${fill(t.vehicle.photoOf, { n: index + 1, total: photos.length })}`
              : vehicleTitle(vehicle)
          }
          width={1600}
          height={1200}
          className="aspect-[4/3] w-full rounded-2xl bg-sand-100 object-cover"
        />

        {photos.length > 1 ? (
          <figcaption className="absolute bottom-3 right-3 rounded-full bg-ink-900/70 px-3 py-1 text-xs font-medium text-white">
            {index + 1} / {photos.length}
          </figcaption>
        ) : null}
      </figure>

      {photos.length > 1 ? (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {photos.map((photo, position) => {
            const selected = position === index;
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={fill(t.vehicle.showPhoto, { n: position + 1 })}
                  // Selection is a ring and full opacity, not colour alone.
                  className={`block w-full overflow-hidden rounded-xl transition ${
                    selected
                      ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-sand-50"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photoSrc(photo.path, 400)}
                    alt=""
                    width={400}
                    height={300}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full bg-sand-100 object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
