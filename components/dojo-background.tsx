/**
 * Dojo background picture (same /dojo.jpg as the home page).
 *
 * Fixed behind the whole page (-z-10). Back layer: the picture, cropped and
 * blurred. Front layer: the same picture, cover-fitted. On top a paper veil so
 * dense UI (slides, chat) stays readable. Raise/lower the veil by changing the
 * `from-/via-/to-background/..` numbers (bigger = more paper, smaller = more picture).
 *
 * Only visible where the UI above it is transparent or semi-transparent.
 */
export const DOJO_BACKGROUND_IMAGE = '/dojo.jpg';

export function DojoBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DOJO_BACKGROUND_IMAGE}
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover object-center blur-2xl dark:brightness-[0.85]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DOJO_BACKGROUND_IMAGE}
        alt=""
        className="absolute inset-0 size-full object-cover object-center dark:brightness-[0.85]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/55" />
    </div>
  );
}
