import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  // Yeh ek clean professional medical cross icon hai jo direct code ke andar generate hoga
  const svgIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='%232563eb'/><path d='M256 112v288M112 256h288' stroke='%23ffffff' stroke-width='64' stroke-linecap='round'/></svg>";

  return {
    name: "Pharmacy Management System",
    short_name: "Pharmacy App",
    description: "Manage medicines, sales, purchases, and suppliers efficiently.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: svgIcon,
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: svgIcon,
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  }
}