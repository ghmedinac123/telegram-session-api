# Telegram API Manager - Frontend

Interfaz moderna y minimalista para gestionar sesiones de Telegram, construida con React, TypeScript, Tailwind CSS y TanStack Query.

## ✨ Características

- 🎨 **UI Moderna** - Diseño minimalista con Tailwind CSS
- 🌓 **Modo Oscuro/Claro** - Tema automático persistente
- 📱 **Responsive** - Diseñado mobile-first
- ⚡ **Performance** - Optimizado con TanStack Query
- 🔒 **Autenticación** - JWT con rutas protegidas
- 🎯 **TypeScript** - Type-safe en toda la aplicación
- 🚀 **Vite** - Build rápido y HMR

## 🏗️ Arquitectura

```
src/
├── api/              # API clients (axios)
│   ├── client.ts         # Cliente HTTP configurado
│   ├── auth.api.ts       # Endpoints de autenticación
│   └── sessions.api.ts   # Endpoints de sesiones
│
├── components/       # Componentes reutilizables
│   ├── common/          # Button, Input, Card, Alert
│   └── layout/          # Header, Layout
│
├── contexts/         # React Contexts
│   ├── AuthContext.tsx   # Estado de autenticación
│   └── ThemeContext.tsx  # Tema oscuro/claro
│
├── hooks/           # Custom hooks
│   └── useSessions.ts    # Hooks con TanStack Query
│
├── pages/           # Páginas principales
│   ├── auth/            # Login
│   └── dashboard/       # Dashboard con sesiones
│
├── routes/          # Configuración de rutas
│   ├── ProtectedRoute.tsx
│   └── index.tsx
│
├── types/           # TypeScript types
│   ├── auth.types.ts
│   ├── session.types.ts
│   └── api.types.ts
│
├── config/          # Configuración
│   └── constants.ts     # Constantes globales
│
└── styles/          # Estilos globales
    └── index.css        # Tailwind + custom styles
```

## 🚀 Instalación

### Requisitos

- Node.js 18+
- pnpm 8+

### 1. Instalar dependencias

```bash
cd frontend
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
VITE_API_URL=/api/v1
```

### 3. Ejecutar en desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

### 4. Build para producción

```bash
pnpm build
```

Los archivos compilados estarán en `/dist`

## 🔧 Scripts Disponibles

```bash
pnpm dev        # Iniciar servidor de desarrollo
pnpm build      # Compilar para producción
pnpm preview    # Preview del build de producción
```

## 📦 Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| React | 19.x | UI Library |
| TypeScript | 5.x | Type Safety |
| Vite | 7.x | Build Tool |
| React Router | 7.x | Routing |
| TanStack Query | 5.x | Data Fetching |
| Axios | 1.x | HTTP Client |
| Tailwind CSS | 4.x | Styling |
| Lucide React | 0.x | Icons |

## 🎨 Componentes Disponibles

### Button
```tsx
<Button variant="primary" isLoading={false} fullWidth>
  Click me
</Button>
```

### Input
```tsx
<Input
  label="Username"
  type="text"
  error="Error message"
/>
```

### Card
```tsx
<Card hover onClick={() => {}}>
  Content
</Card>
```

### Alert
```tsx
<Alert variant="success">
  Success message
</Alert>
```

## 🔐 Autenticación

El sistema usa JWT tokens con refresh tokens:

1. **Login** - POST `/api/v1/auth/login`
2. **Tokens guardados** en `localStorage`
3. **Auto-refresh** cuando expiran
4. **Rutas protegidas** con `ProtectedRoute`

## 🌐 API Integration

### Interceptors

- **Request**: Añade token JWT automáticamente
- **Response**: Maneja errores globalmente, redirige al login si el token expira

### TanStack Query

Todas las peticiones usan hooks personalizados:

```tsx
import { useSessions, useCreateSession } from '@/hooks'

const { data, isLoading } = useSessions()
const createSession = useCreateSession()
```

## 🎨 Tema Oscuro/Claro

El tema se guarda automáticamente en `localStorage` y respeta las preferencias del sistema:

```tsx
import { useTheme } from '@/contexts'

const { theme, toggleTheme } = useTheme()
```

## 📱 Responsive

Diseñado mobile-first con breakpoints de Tailwind:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## 🔨 Próximas Funcionalidades

- [ ] Crear nueva sesión (SMS y QR)
- [ ] Verificar código SMS
- [ ] Ver estado de sesión en tiempo real
- [ ] Enviar mensajes individuales
- [ ] Envío masivo de mensajes
- [ ] Subir archivos multimedia

## 📝 Convenciones de Código

- **Components**: PascalCase (`LoginPage.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useSessions.ts`)
- **Types**: PascalCase con sufijo `Type` o descripción (`AuthContextType`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS Classes**: Tailwind utilities

## 🤝 Contribuir

1. Crear branch feature
2. Hacer cambios
3. Crear Pull Request

## 📄 Licencia

MIT
