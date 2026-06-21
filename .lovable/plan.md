## Objetivo
Eliminar el apartado "Biblioteca" duplicado del panel de administración, conservando únicamente "Recetas".

## Verificación previa
- `/app/admin/recetas` → `<AdminRecipes />` (conservar)
- `/app/admin/biblioteca` → `<AdminRecipes />` (eliminar)
Ambas rutas apuntan al mismo componente, por lo que todas las recetas seguirán siendo accesibles desde `/app/admin/recetas`.

## Cambios

### 1. src/App.tsx
Eliminar la ruta duplicada:
```
<Route path="admin/biblioteca" element={<AdminOnly><AdminRecipes /></AdminOnly>} />
```

### 2. src/pages/Admin.tsx
Eliminar el botón de menú "Biblioteca" del grupo "Contenido".

## Límites
- No se elimina ninguna receta de la base de datos.
- No se toca el componente `AdminRecipes` ni sus datos.
- Solo se afectan el menú de navegación y la ruta duplicada.