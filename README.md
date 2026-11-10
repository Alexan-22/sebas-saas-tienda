# Sebas Collection | Frontend

Aplicación web de comercio electrónico y administración para una tienda de ropa, desarrollada con Angular, TypeScript y Tailwind CSS.

Integra catálogo público, compras online, gestión administrativa, punto de venta presencial y reportes exportables.

**Sitio web:** [www.sebascollection.com](https://www.sebascollection.com/)

**Autor:** Alexander Ancori Conza  
**Tipo de proyecto:** Full Stack — comercio electrónico y gestión de ventas.

## Descripción

Sebas Collection reúne las ventas online y presenciales en una misma plataforma.

Los clientes pueden explorar prendas, seleccionar tallas, gestionar su carrito y consultar sus compras. El administrador dispone de herramientas para gestionar productos, inventario, usuarios, ventas y reportes.

El nombre técnico original del proyecto es `TiendaSebasPolvosFrontend`. La marca pública utilizada es **Sebas Collection**.

## Tecnologías

- Angular y Angular Router.
- TypeScript.
- HTML y Tailwind CSS.
- HttpClient para comunicación con la API REST.
- Autenticación mediante JWT.
- jsPDF y jspdf-autotable.
- SheetJS (`xlsx`).
- Git y GitHub.
- Azure App Service.

Proyecto generado originalmente con Angular CLI 22.1.8. Consultar `package.json` para las versiones actuales.

## Funcionalidades

### Tienda online

- Catálogo de prendas para hombres, mujeres y niños.
- Navegación por género y categoría.
- Detalle de productos con imágenes, precio y tallas.
- Consulta de stock por talla.
- Visualización de ofertas.
- Carrito de compras.
- Checkout y confirmación de compra.
- Historial de compras del cliente.
- Consulta de detalle y comprobante imprimible.

### Administración

- Gestión de productos e imágenes.
- Administración de tallas y existencias.
- Gestión de usuarios.
- Consulta de ventas online y presenciales.
- Punto de venta para registrar ventas en tienda.
- Registro de clientes presenciales.
- Consulta e impresión de comprobantes.

### Reportes

- Resumen de ventas.
- Ventas y detalle de ventas.
- Productos vendidos.
- Medios de pago.
- Categorías.
- Comparación por canal de venta.
- Filtros por período y origen ONLINE/PRESENCIAL.
- Exportación a PDF.
- Exportación a Excel con importes numéricos y formato monetario en soles.

## Arquitectura y despliegue

| Componente | Tecnología | Alojamiento |
|---|---|---|
| Frontend | Angular | Azure App Service |
| Backend | Java y Spring Boot | Azure App Service independiente |
| Base de datos | PostgreSQL | Supabase |
| Acceso público | Dominio propio y HTTPS | www.sebascollection.com |

El navegador consume la API REST del backend. El frontend no se conecta directamente a PostgreSQL.

Las credenciales de base de datos y la clave de firma JWT permanecen en el backend.

## Roles

| Rol | Acceso |
|---|---|
| CLIENTE | Tienda, carrito, checkout e historial de compras propias |
| ADMIN | Administración, inventario, ventas, POS, usuarios y reportes |

Los controles de navegación del frontend complementan la autorización aplicada por el backend.

## Requisitos para desarrollo

- Node.js compatible con la versión de Angular instalada.
- npm.
- Git.
- Backend disponible.
- Editor como Visual Studio Code.

Comprobar herramientas:

```powershell
node --version
npm --version
git --version
```

## Instalación

Clonar este repositorio e ingresar a su carpeta local.

Si existe `package-lock.json`, instalar las versiones registradas:

```powershell
npm ci
```

Si se necesita instalar o actualizar dependencias:

```powershell
npm install
```

## Configuración de la API

Revisar la configuración de conexión utilizada por el proyecto y establecer la URL del backend.

Entornos habituales:

| Entorno | Dirección |
|---|---|
| Desarrollo | http://localhost:8080 |
| Producción | URL HTTPS del backend desplegado en Azure |

Conservar el prefijo `/api` según la forma en que los servicios HTTP del proyecto construyen sus rutas.

No incluir contraseñas, secretos JWT ni claves privadas en el código Angular: la configuración del frontend es visible para el navegador.

## Ejecutar localmente

```powershell
npx ng serve --open
```

Dirección:

```text
http://localhost:4200
```

La aplicación se actualiza al modificar los archivos de desarrollo.

El backend debe estar iniciado y permitir el origen local mediante su configuración CORS.

Para detener Angular:

```text
Ctrl + C
```

## Compilar

```powershell
npx ng build --configuration production
```

La salida se genera en el directorio configurado en `angular.json`, normalmente dentro de `dist/`.

Antes de publicar, comprobar:

- URL HTTPS correcta de la API.
- Ausencia de referencias accidentales a localhost.
- Carga de imágenes.
- Inicio de sesión y permisos.
- Acceso directo y recarga de rutas Angular.

El alojamiento debe redirigir las rutas del cliente a `index.html` cuando corresponda.

## Exportación de reportes

Dependencias utilizadas:

| Paquete | Función |
|---|---|
| jspdf | Generación de documentos PDF |
| jspdf-autotable | Tablas para reportes PDF |
| xlsx | Generación de archivos Excel |

Se instalan junto con las demás dependencias del proyecto.

Instalación manual, cuando sea necesaria:

```powershell
npm install jspdf jspdf-autotable xlsx
```

## Pruebas

Ejecutar las pruebas unitarias configuradas:

```powershell
npx ng test
```

El proyecto original utiliza Vitest; revisar la configuración vigente y los scripts de `package.json`.

La ejecución correcta de los comandos debe comprobarse en cada entorno. Este README no declara una cobertura de pruebas específica.

Para pruebas de extremo a extremo, primero debe existir un framework y una configuración correspondiente. Angular CLI no incluye esa infraestructura de manera predeterminada.

## Alcance de pagos

El registro de un medio de pago no equivale a una confirmación automática del proveedor.

El flujo actual de Yape requiere verificación manual. Las opciones de tarjeta de demostración no constituyen una pasarela de pagos real y no deben recibir datos reales de tarjetas.

## Trabajo realizado

- Desarrollo de la interfaz pública y administrativa.
- Integración con API REST y autenticación JWT.
- Implementación del flujo de compra.
- Integración del punto de venta presencial.
- Desarrollo de reportes con exportación PDF y Excel.
- Adaptación de la interfaz para distintos tamaños de pantalla.
- Configuración del despliegue en Azure y uso de dominio propio.

## Mejoras pendientes

- Pulir la presentación de algunas secciones en móvil.
- Ampliar las pruebas automatizadas.
- Integrar un proveedor de pagos para confirmación automática.
- Mejorar la supervisión de errores y experiencia ante fallos de conexión.

## Autor

**Alexander Ancori Conza**

GitHub: [Alexan-22](https://github.com/Alexan-22)

Sitio web: [Sebas Collection](https://www.sebascollection.com/)
