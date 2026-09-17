import { useRouter } from "@tanstack/react-router";
import { type ChangeEvent, useState } from "react";
import { t } from "~/admin/strings.ts";
import { Card, Notice, QuietButton, SectionHeading } from "~/admin/ui.tsx";
import { photoSrc } from "~/domain/photos.ts";
import type { VehiclePhoto } from "~/domain/vehicle.ts";
import {
  deleteVehiclePhoto,
  reorderVehiclePhotos,
  uploadVehiclePhoto,
} from "~/server/admin/photos.ts";

interface Props {
  vehicleId: string;
  photos: readonly VehiclePhoto[];
}

export function PhotoManager({ vehicleId, photos }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setProblem(null);
    try {
      await work();
      await router.invalidate();
    } catch (error) {
      console.error("Photo operation failed", error);
      setProblem(error instanceof Error ? error.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    // Clear immediately so picking the same file twice still fires a change.
    event.target.value = "";
    if (files.length === 0) return;

    await run(async () => {
      // Sequential, not parallel: each upload resizes three variants, and a
      // phone sending eight photos at once would fight itself for memory.
      for (const file of files) {
        const form = new FormData();
        form.set("vehicleId", vehicleId);
        form.set("file", file);
        await uploadVehiclePhoto({ data: form });
      }
    });
  }

  function reorder(from: number, to: number) {
    const next = [...photos];
    const moving = next[from];
    if (!moving || to < 0 || to >= next.length) return;
    next.splice(from, 1);
    next.splice(to, 0, moving);
    return run(() => reorderVehiclePhotos({ data: { ids: next.map((photo) => photo.id) } }));
  }

  return (
    <Card>
      <SectionHeading title={t.vehicle.photos} hint={t.vehicle.photosHint} />

      {photos.length > 0 ? (
        <ul className="mb-4 grid gap-3 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="flex items-center gap-3 rounded-xl border border-sand-200 p-2"
            >
              {/*
                The position sits on the thumbnail rather than beside it: the
                controls already fill the row, and an extra word of text pushed
                "delete" onto a second line and made the cards uneven.
              */}
              <span className="relative shrink-0">
                <img
                  src={photoSrc(photo.path, 400)}
                  // Position matters here, so the photo is not decorative: this
                  // is what tells a screen reader which one the buttons act on.
                  alt={t.vehicle.photoPosition.replace("{n}", String(index + 1))}
                  width={96}
                  height={72}
                  className="h-18 w-24 rounded-lg object-cover"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-1 top-1 rounded-md bg-ink-900/75 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white"
                >
                  {index + 1}
                </span>
              </span>

              <div className="flex flex-wrap gap-1.5">
                {index === 0 ? (
                  /*
                   * This slot used to hold a bare "1", which said nothing: not
                   * that the photo is the one shown on the card, and not what
                   * the number referred to, since no other photo was numbered.
                   * It is a status, so it reads as a badge rather than as a
                   * button that happens to be unavailable.
                   */
                  <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
                    {t.vehicle.mainPhoto}
                  </span>
                ) : (
                  <QuietButton onClick={() => reorder(index, 0)} disabled={busy}>
                    {t.vehicle.makeFirst}
                  </QuietButton>
                )}
                <QuietButton
                  onClick={() => reorder(index, index - 1)}
                  disabled={busy || index === 0}
                >
                  ↑<span className="sr-only"> {t.vehicles.moveUp}</span>
                </QuietButton>
                <QuietButton
                  onClick={() => reorder(index, index + 1)}
                  disabled={busy || index === photos.length - 1}
                >
                  ↓<span className="sr-only"> {t.vehicles.moveDown}</span>
                </QuietButton>
                <QuietButton
                  danger
                  disabled={busy}
                  onClick={() => run(() => deleteVehiclePhoto({ data: { id: photo.id } }))}
                >
                  {t.vehicle.deletePhoto}
                </QuietButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-500 px-5 py-2.5 font-medium text-brand-500 hover:bg-brand-50">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={busy}
          onChange={onPick}
          className="sr-only"
        />
        {busy ? t.vehicle.uploading : t.vehicle.upload}
      </label>

      {problem ? (
        <div className="mt-3">
          <Notice tone="error">{problem}</Notice>
        </div>
      ) : null}
    </Card>
  );
}
