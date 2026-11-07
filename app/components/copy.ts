import type { Language } from "./order-types";
export const copy = {
  en: {
    eyebrow: "A little clarity before closing.",
    title: "Your kitchen notes.\nReady for your supplier.",
    intro:
      "Photograph your handwritten kitchen note. We’ll read it in its original language and help you check every item.",
    language: "Review language",
    note: "Start with your handwritten note.",
    noteHint:
      "Add a US ZIP code. We put the best shipped match for each item in your cart.",
    zip: "ZIP code",
    zipHint: "We assume shipping to this ZIP.",
    shipsTo: "Ships to",
    priceAtStore: "Price on the store page",
    placeholder: "2 doz eggs, 1 case oat milk",
    takePhoto: "Take a photo",
    uploadPhoto: "Upload note photo",
    replacePhoto: "Replace photo",
    scanPrompt: "From handwriting to a clear list.",
    scanHint: "English or Spanish notes · JPG, PNG or WebP",
    photoAlt: "Your handwritten kitchen note",
    photoCaption:
      "Keep the handwriting in view while you check the transcription.",
    photoPrivacy:
      "Your photo is sent to our reading service to extract the text. No supplier order is sent.",
    scanning: "Reading your handwriting…",
    invalidPhoto: "Choose a clear JPG, PNG or WebP photo under 20 MB.",
    scanFailure:
      "We couldn’t read this photo. Try a clearer image, or transcribe what you see below.",
    manualFallback: "Transcribe this note myself",
    extracted: "CHECK THE EXTRACTED LIST",
    manualHeading: "MANUALLY TRANSCRIBED NOTE",
    extractedHint:
      "Compare this text with your photo. Correct names, quantities and units; [?] means unclear handwriting.",
    review: "Add to cart",
    reviewing: "Finding the best match…",
    source: "YOUR KITCHEN NOTE",
    editList: "Start a new list",
    workflow: "Your order, in three steps",
    intake: "Scan",
    check: "Cart",
    preview: "Preview",
    reviewTitle: "Your cart",
    reviewIntro: "The best match for each item, ready to ship.",
    original: "Original note",
    interpreted: "Current interpretation",
    supplier: "Supplier item",
    requested: "You asked for",
    offered: "Each supplier case",
    price: "Price per case",
    extra: "above your request",
    included: "Included",
    attention: "Needs your review",
    skipped: "Skipped",
    skip: "Skip this item",
    edit: "Edit interpretation",
    restore: "Edit & reconsider",
    save: "Save correction",
    cancel: "Cancel",
    correction: "Corrected ingredient, quantity and unit",
    cases: "Cases to buy",
    buy: "Buy selected cases",
    buying: "Purchase quantity",
    noMatch: "No match for this ZIP",
    held: "Not included in the subtotal yet",
    skippedHint: "Kept here for reference. Excluded from your order.",
    summary: "Your supplier preview",
    summaryHint: "Only included items appear in your order.",
    subtotal: "Provisional subtotal",
    total: "Order total",
    empty: "No items included",
    blocked: "Resolve or skip every flagged item to continue.",
    emptyHint: "Include at least one item before approving.",
    approve: "Approve simulated order",
    approving: "Saving your order…",
    saving: "Updating…",
    simulation: "Demo only · No order will be sent",
    fixtures:
      "Illustrative English / Spanish demo. Translations, catalog packs and prices are unverified fixtures.",
    complete: "Reviewed. Ready to reference.",
    completeHint:
      "Your simulated order is saved. Nothing was purchased or sent to a supplier.",
    receipt: "SIMULATED ORDER",
    orderId: "Order reference",
    sku: "SKU",
    quantity: "Quantity",
    caseUnit: "case",
    casesUnit: "cases",
    each: "each",
    cartons: "cartons",
    requestedUnknown: "Needs clarification",
    retry: "Please try again. Your note has been kept.",
    network:
      "We couldn’t reach the ordering service. Check the connection and try again. If approval was interrupted, retrying is safe.",
    stale:
      "This list changed elsewhere. We loaded the latest version. Review it again before continuing.",
    finalized:
      "This draft is already finalized. It can’t be edited. Start a new list to make changes.",
    reviewRequired:
      "This order still needs review. Resolve any flagged items and include at least one item.",
    invalid: "Check your entry and try again.",
    unavailable: "This draft is no longer available. Start a new list.",
    unexpected:
      "The ordering service returned an unexpected response. Please try again.",
    reasons: {
      unknown_item: "We couldn’t match this ingredient. Correct it or skip it.",
      ambiguous_item:
        "More than one item could match. Make the ingredient more specific.",
      missing_quantity: "How much do you need? Add a quantity.",
      missing_unit: "Add a unit, such as dozen or case.",
      pack_mismatch:
        "The supplier pack differs from your request. Choose the cases to buy or skip this item.",
      unrecognized_input:
        "We couldn’t interpret this line. Correct it or skip it.",
    },
  },
  es: {
    eyebrow: "Un poco de claridad antes de cerrar.",
    title: "Las notas de tu cocina.\nListas para tu proveedor.",
    intro:
      "Fotografía tu nota de cocina escrita a mano. La leeremos en su idioma original para ayudarte a revisar cada producto.",
    language: "Idioma de revisión",
    note: "Empieza con tu nota escrita a mano.",
    noteHint:
      "Añade un código postal de EE. UU. Ponemos la mejor opción con envío en tu carrito.",
    zip: "Código postal",
    zipHint: "Asumimos el envío a este código.",
    shipsTo: "Envío a",
    priceAtStore: "Precio en la página de la tienda",
    placeholder: "2 docenas de huevos, 1 caja de leche de avena",
    takePhoto: "Tomar una foto",
    uploadPhoto: "Subir foto de la nota",
    replacePhoto: "Cambiar foto",
    scanPrompt: "De una nota manuscrita a una lista clara.",
    scanHint: "Notas en inglés o español · JPG, PNG o WebP",
    photoAlt: "Tu nota de cocina escrita a mano",
    photoCaption: "Compara la nota manuscrita con la transcripción.",
    photoPrivacy:
      "La foto se envía a nuestro servicio de lectura para extraer el texto. No se envía ningún pedido al proveedor.",
    scanning: "Leyendo tu nota manuscrita…",
    invalidPhoto: "Elige una foto clara JPG, PNG o WebP de menos de 20 MB.",
    scanFailure:
      "No pudimos leer la foto. Prueba una imagen más clara o transcribe lo que ves.",
    manualFallback: "Transcribir esta nota manualmente",
    extracted: "REVISA LA LISTA EXTRAÍDA",
    manualHeading: "NOTA TRANSCRITA MANUALMENTE",
    extractedHint:
      "Compara el texto con tu foto. Corrige nombres, cantidades y unidades; [?] indica texto poco claro.",
    review: "Añadir al carrito",
    reviewing: "Buscando la mejor opción…",
    source: "TU NOTA DE COCINA",
    editList: "Empezar una lista nueva",
    workflow: "Tu pedido, en tres pasos",
    intake: "Escanear",
    check: "Carrito",
    preview: "Vista previa",
    reviewTitle: "Tu carrito",
    reviewIntro: "La mejor opción de cada producto, lista para enviar.",
    original: "Nota original",
    interpreted: "Interpretación actual",
    supplier: "Producto del proveedor",
    requested: "Lo que pediste",
    offered: "Cada caja del proveedor",
    price: "Precio por caja",
    extra: "por encima de tu solicitud",
    included: "Incluido",
    attention: "Requiere revisión",
    skipped: "Omitido",
    skip: "Omitir este producto",
    edit: "Editar interpretación",
    restore: "Editar y reconsiderar",
    save: "Guardar corrección",
    cancel: "Cancelar",
    correction: "Ingrediente, cantidad y unidad corregidos",
    cases: "Cajas a comprar",
    buy: "Comprar cajas seleccionadas",
    buying: "Cantidad de compra",
    noMatch: "Sin opción para este código",
    held: "Aún no incluido en el subtotal",
    skippedHint: "Se conserva como referencia. Excluido del pedido.",
    summary: "Vista previa del proveedor",
    summaryHint: "Solo aparecen los productos incluidos.",
    subtotal: "Subtotal provisional",
    total: "Total del pedido",
    empty: "No hay productos incluidos",
    blocked: "Resuelve u omite los productos pendientes para continuar.",
    emptyHint: "Incluye al menos un producto antes de aprobar.",
    approve: "Aprobar pedido simulado",
    approving: "Guardando tu pedido…",
    saving: "Actualizando…",
    simulation: "Solo demostración · No se enviará ningún pedido",
    fixtures:
      "Demostración ilustrativa en inglés y español. Las traducciones, los tamaños y los precios no están verificados.",
    complete: "Revisado. Listo para consultar.",
    completeHint:
      "Tu pedido simulado está guardado. No se compró ni se envió nada al proveedor.",
    receipt: "PEDIDO SIMULADO",
    orderId: "Referencia del pedido",
    sku: "SKU",
    quantity: "Cantidad",
    caseUnit: "caja",
    casesUnit: "cajas",
    each: "unidades",
    cartons: "envases",
    requestedUnknown: "Requiere aclaración",
    retry: "Inténtalo de nuevo. Tu nota se ha conservado.",
    network:
      "No pudimos conectar con el servicio. Comprueba la conexión e inténtalo de nuevo. Si se interrumpió la aprobación, puedes repetirla sin duplicar el pedido.",
    stale:
      "La lista cambió en otra sesión. Cargamos la versión actual. Revísala antes de continuar.",
    finalized:
      "Este borrador ya está finalizado y no se puede editar. Empieza una lista nueva.",
    reviewRequired:
      "El pedido necesita revisión. Resuelve los productos pendientes e incluye al menos uno.",
    invalid: "Comprueba los datos e inténtalo de nuevo.",
    unavailable:
      "Este borrador ya no está disponible. Empieza una lista nueva.",
    unexpected:
      "El servicio devolvió una respuesta inesperada. Inténtalo de nuevo.",
    reasons: {
      unknown_item: "No encontramos este ingrediente. Corrígelo u omítelo.",
      ambiguous_item: "Hay varias coincidencias. Especifica el ingrediente.",
      missing_quantity: "¿Cuánto necesitas? Añade una cantidad.",
      missing_unit: "Añade una unidad, como docena o caja.",
      pack_mismatch:
        "El tamaño del proveedor difiere de tu solicitud. Elige cuántas cajas comprar u omite el producto.",
      unrecognized_input:
        "No pudimos interpretar esta línea. Corrígela u omítela.",
    },
  },
};
export type Copy = (typeof copy)[Language];

export function unitLabel(unit: string | null, language: Language) {
  const t = copy[language];
  if (unit === "each") return t.each;
  if (unit === "carton" || unit === "cartons") return t.cartons;
  if (unit === "case") return t.caseUnit;
  if (unit === "cases") return t.casesUnit;
  if (unit === "tsp") return language === "es" ? "cucharaditas" : "tsp";
  if (unit === "cup") return language === "es" ? "tazas" : "cups";
  if (unit === "lb") return language === "es" ? "libras" : "lb";
  return unit ?? "";
}
