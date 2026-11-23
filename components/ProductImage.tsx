/* eslint-disable @next/next/no-img-element -- las fotos son URLs que carga el
   admin, de cualquier dominio: next/image exigiría declarar cada dominio. */

/** La foto o ilustración del producto, o la inicial si no tiene. */
export default function ProductImage({
  src,
  name,
  className = "",
  eager = false,
}: {
  src: string | null;
  name: string;
  className?: string;
  /** Cargar ya (vista previa del formulario) en vez de al acercarse con el scroll. */
  eager?: boolean;
}) {
  // Las ilustraciones de ejemplo (/productos/*.svg) van con aire, sobre el
  // fondo calabaza. Las fotos de verdad, de borde a borde sobre blanco: casi
  // todas las fotos de producto tienen fondo blanco y así se funden con el
  // recuadro. Se ven enteras (contain): recortarlas para llenar el cuadrado
  // cortaría los costados de un producto apaisado.
  const illustration = src?.startsWith("/productos/") ?? true;
  return (
    <div
      className={`flex aspect-square items-center justify-center overflow-hidden ${
        illustration ? "bg-calabaza" : "bg-white"
      } ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          className={`h-full w-full object-contain ${illustration ? "p-[8%]" : ""}`}
        />
      ) : (
        <span aria-hidden className="display text-5xl text-yerba/40">
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
}
