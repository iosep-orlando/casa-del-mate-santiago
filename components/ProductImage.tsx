/* eslint-disable @next/next/no-img-element -- las fotos son URLs que carga el
   admin, de cualquier dominio: next/image exigiría declarar cada dominio. */

/** La foto del producto sobre el fondo calabaza, o la inicial si no tiene. */
export default function ProductImage({
  src,
  name,
  className = "",
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  return (
    <div className={`flex aspect-square items-center justify-center overflow-hidden bg-calabaza ${className}`}>
      {src ? (
        <img src={src} alt={name} loading="lazy" className="h-full w-full object-contain p-[8%]" />
      ) : (
        <span aria-hidden className="display text-5xl text-yerba/40">
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}
