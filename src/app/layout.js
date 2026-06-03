import './globals.css'

export const metadata = {
  title: 'Gestión de Tareas',
  description: 'Sistema de gestión de tareas y reuniones',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
