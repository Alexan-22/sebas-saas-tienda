import { Routes } from '@angular/router';

// =====================================================
// TIENDA PUBLICA
// =====================================================
import { Home } from './features/home/home';
import { ProductDetail } from './features/product-detail/product-detail';
import { Cart } from './features/cart/cart';
import { Login } from './features/login/login';
import { Registro } from './features/registro/registro';
import { Checkout } from './features/checkout/checkout';
import { CompraExitosa } from './features/compra-exitosa/compra-exitosa';
import { MisCompras } from './features/mis-compras/mis-compras';
import { DetalleCompra } from './features/detalle-compra/detalle-compra';
import { Tienda } from './features/tienda/tienda';

// =====================================================
// SEGURIDAD
// =====================================================
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

// =====================================================
// PANEL ADMIN
// =====================================================
import { AdminLayout } from './features/admin/admin-layout/admin-layout';
import { Dashboard } from './features/admin/dashboard/dashboard';
import { Productos } from './features/admin/productos/productos';
import { ProductoForm } from './features/admin/producto-form/producto-form';
import { Stock } from './features/admin/stock/stock';
import { Ventas } from './features/admin/ventas/ventas';
import { Usuarios } from './features/admin/usuarios/usuarios';
import { Reportes } from './features/admin/reportes/reportes';
import { HomeAdmin } from './features/admin/home-admin/home-admin';

export const routes: Routes = [

  // =====================================================
  // TIENDA PUBLICA
  // =====================================================
  {
    path: '',
    component: Home
  },
  {
    path: 'producto/:id',
    component: ProductDetail
  },
  {
    path: 'carrito',
    component: Cart
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'registro',
    component: Registro
  },
  {
    path: 'tienda',
    component: Tienda
  },

  // =====================================================
  // CLIENTE AUTENTICADO
  // =====================================================
  { path: 'transferencia/pendiente/:idVenta', canActivate: [authGuard], loadComponent: () => import('./features/transferencia-pendiente/transferencia-pendiente').then(m=>m.TransferenciaPendiente) },
  { path: 'yape/pendiente/:idVenta', canActivate: [authGuard], loadComponent: () => import('./features/yape-pendiente/yape-pendiente').then(m => m.YapePendiente) },
  { path: 'checkout',
    component: Checkout,
    canActivate: [authGuard]
  },
  {
    path: 'compra-exitosa',
    component: CompraExitosa,
    canActivate: [authGuard]
  },
  {
    path: 'mis-compras',
    component: MisCompras,
    canActivate: [authGuard]
  },

{
  path: 'mi-cuenta',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./features/mi-cuenta/mi-cuenta')
      .then(m => m.MiCuenta)
},

  {
    path: 'mis-compras/:id',
    component: DetalleCompra,
    canActivate: [authGuard]
  },

  // =====================================================
  // ADMINISTRADOR DE TIENDA
  // =====================================================
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],

    children: [

{
  path: 'perfil',
  loadComponent: () =>
    import('./features/admin/perfil/perfil-admin')
      .then(m => m.PerfilAdmin)
},


      // -------------------------------------------------
      // DASHBOARD
      // -------------------------------------------------
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        component: Dashboard
      },

      // -------------------------------------------------
      // CATALOGO
      // -------------------------------------------------
      {
        path: 'productos',
        component: Productos
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/admin/categorias/categorias')
            .then(m => m.CategoriasAdmin)
      },
      {
        path: 'productos/nuevo',
        component: ProductoForm
      },
      {
        path: 'productos/:id/editar',
        component: ProductoForm
      },
      {
        path: 'mayoristas',
        loadComponent: () =>
          import('./features/admin/mayoristas/mayoristas')
            .then(m => m.Mayoristas)
      },
      {
        path: 'stock',
        component: Stock
      },

      
      // -------------------------------------------------
      // NEGOCIO - VENTAS
      // -------------------------------------------------
      {
        path: 'ventas',
        component: Ventas
      },

      // -------------------------------------------------
      // NEGOCIO - PEDIDOS ONLINE
      // -------------------------------------------------
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/admin/pedidos/pedidos')
            .then(m => m.Pedidos)
      },
      {
  path: 'envios',
  loadComponent: () =>
    import('./features/admin/envios/envios')
      .then(m => m.Envios)
},


      // -------------------------------------------------
      // B.2.1 - ADMINISTRACION DE PAGOS SANDBOX
      // -------------------------------------------------
      {
        path: 'pagos',
        loadComponent: () =>
          import('./features/admin/pagos/pagos')
            .then(m => m.PagosAdmin)
      },

      // -------------------------------------------------
      // B.2.2 - CONFIGURACION YAPE POR TIENDA
      // -------------------------------------------------
      { path: 'transferencias', loadComponent: () => import('./features/transferencias-admin/transferencias-admin').then(m=>m.TransferenciasAdmin) },
      { path: 'pagos-yape', loadComponent: () => import('./features/admin/yape-pagos/yape-pagos').then(m => m.YapePagosAdmin) },
      { path: 'yape',
        loadComponent: () =>
          import('./features/admin/yape/yape')
            .then(m => m.YapeAdmin)
      },

      // -------------------------------------------------
      // USUARIOS Y REPORTES
      // -------------------------------------------------
      {
        path: 'usuarios',
        component: Usuarios
      },
      {
        path: 'reportes',
        component: Reportes
      },

      // -------------------------------------------------
      // CONFIGURACION DE TIENDA
      // -------------------------------------------------
      {
        path: 'home',
        component: HomeAdmin
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/admin/configuracion-tienda/configuracion-tienda')
            .then(m => m.ConfiguracionTienda)
      }
    ]
  },

  // =====================================================
  // RUTA NO ENCONTRADA
  // =====================================================
  {
    path: '**',
    redirectTo: ''
  }

];
