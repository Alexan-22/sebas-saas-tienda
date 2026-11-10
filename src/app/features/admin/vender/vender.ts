import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Producto } from '../../../core/models/producto';
import { ProductoTalla } from '../../../core/models/producto-talla';
import { ClientePresencialRequest, ClientePresencialResponse } from '../../../core/models/cliente-presencial';
import { VentaPosRequest, VentaPosResponse } from '../../../core/models/venta';

import { ProductoService } from '../../../core/services/producto';
import { ProductoTallaService } from '../../../core/services/producto-talla';
import { ClientePresencialService } from '../../../core/services/cliente-presencial';
import { VentaService } from '../../../core/services/venta';

interface ItemVentaPos {
  idProducto: number;
  idProductoTalla: number;
  nombre: string;
  talla: string;
  precio: number;
  cantidad: number;
  stock: number;
  subtotal: number;
}

@Component({
  selector: 'app-vender',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vender.html',
  styleUrl: './vender.css'
})
export class Vender implements OnInit {
  // DATOS
  productos: Producto[] = [];
  clientes: ClientePresencialResponse[] = [];
  tallasProducto: ProductoTalla[] = [];
  carrito: ItemVentaPos[] = [];
  itemsVentaRealizada: ItemVentaPos[] = [];

  // FILTROS
  busquedaCliente = '';
  busquedaProducto = '';

  // CLIENTE PRESENCIAL
  clienteSeleccionado: ClientePresencialResponse | null = null;
  mostrarFormularioCliente = false;
  registrandoCliente = false;
  nuevoCliente: ClientePresencialRequest = {
    nombre: '',
    apellido: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    telefono: '',
    correo: ''
  };

  // PRODUCTO
  productoSeleccionado: Producto | null = null;
  productoTallaSeleccionado: ProductoTalla | null = null;
  cantidad = 1;

  // PAGO
  medioPago: 'EFECTIVO' | 'YAPE' | 'TARJETA' = 'EFECTIVO';

  // ESTADO
  cargandoDatos = false;
  cargandoTallas = false;
  procesandoVenta = false;
  mensajeError = '';
  ventaRealizada: VentaPosResponse | null = null;

  constructor(
    private productoService: ProductoService,
    private productoTallaService: ProductoTallaService,
    private clientePresencialService: ClientePresencialService,
    private ventaService: VentaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  // CARGA INICIAL
  cargarDatos(): void {
    this.cargandoDatos = true;
    this.mensajeError = '';
    this.cargarProductos();
    this.cargarClientes();
  }

  private cargarProductos(): void {
    this.productoService.listar().subscribe({
      next: productos => {
        this.productos = productos.filter(producto => producto.estado);
        this.actualizarVista();
      },
      error: error => {
        console.error('Error cargando productos:', error);
        this.mensajeError = 'No se pudieron cargar los productos.';
        this.actualizarVista();
      }
    });
  }

  private cargarClientes(): void {
    this.clientePresencialService.listar().subscribe({
      next: clientes => {
        this.clientes = clientes.filter(cliente => cliente.estado);
        this.cargandoDatos = false;
        this.actualizarVista();
      },
      error: error => {
        console.error('Error cargando clientes presenciales:', error);
        this.clientes = [];
        this.cargandoDatos = false;
        this.mensajeError = 'No se pudieron cargar los clientes presenciales.';
        this.actualizarVista();
      }
    });
  }

  // CLIENTES PRESENCIALES
  get clientesFiltrados(): ClientePresencialResponse[] {
    const termino = this.busquedaCliente.trim().toLowerCase();
    if (!termino) return this.clientes;

    return this.clientes.filter(cliente => {
      const texto = [
        cliente.nombre,
        cliente.apellido || '',
        cliente.tipoDocumento,
        cliente.numeroDocumento,
        cliente.telefono || '',
        cliente.correo || ''
      ].join(' ').toLowerCase();

      return texto.includes(termino);
    });
  }

  seleccionarCliente(cliente: ClientePresencialResponse): void {
    this.clienteSeleccionado = cliente;
    this.busquedaCliente = `${cliente.nombre} ${cliente.apellido || ''}`.trim();
    this.mostrarFormularioCliente = false;
    this.mensajeError = '';
    this.ventaRealizada = null;
  }

  quitarCliente(): void {
    this.clienteSeleccionado = null;
    this.busquedaCliente = '';
    this.mensajeError = '';
  }

  abrirFormularioCliente(): void {
    this.mostrarFormularioCliente = true;
    this.clienteSeleccionado = null;
    this.mensajeError = '';
    this.limpiarFormularioCliente();
  }

  cancelarNuevoCliente(): void {
    this.mostrarFormularioCliente = false;
    this.mensajeError = '';
    this.limpiarFormularioCliente();
  }

  registrarCliente(): void {
    this.mensajeError = '';
    const nombre = this.nuevoCliente.nombre.trim();
    const tipoDocumento = this.nuevoCliente.tipoDocumento.trim().toUpperCase();
    const numeroDocumento = this.nuevoCliente.numeroDocumento.trim();

    if (!nombre) {
      this.mensajeError = 'Ingresa el nombre del cliente.';
      return;
    }
    if (!tipoDocumento) {
      this.mensajeError = 'Selecciona el tipo de documento.';
      return;
    }
    if (!numeroDocumento) {
      this.mensajeError = 'Ingresa el número de documento.';
      return;
    }
    if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(numeroDocumento)) {
      this.mensajeError = 'El DNI debe tener 8 dígitos.';
      return;
    }
    if (tipoDocumento === 'RUC' && !/^\d{11}$/.test(numeroDocumento)) {
      this.mensajeError = 'El RUC debe tener 11 dígitos.';
      return;
    }

    const request: ClientePresencialRequest = {
      nombre,
      apellido: this.nuevoCliente.apellido.trim(),
      tipoDocumento,
      numeroDocumento,
      telefono: this.nuevoCliente.telefono.trim(),
      correo: this.nuevoCliente.correo.trim().toLowerCase()
    };

    this.registrandoCliente = true;
    this.clientePresencialService.registrar(request).subscribe({
      next: cliente => {
        this.registrandoCliente = false;
        this.clientes = [...this.clientes, cliente];
        this.clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.clienteSeleccionado = cliente;
        this.busquedaCliente = `${cliente.nombre} ${cliente.apellido || ''}`.trim();
        this.mostrarFormularioCliente = false;
        this.limpiarFormularioCliente();
        this.actualizarVista();
      },
      error: error => {
        console.error('Error registrando cliente presencial:', error);
        this.registrandoCliente = false;
        this.mensajeError = error?.error?.message || error?.error || 'No se pudo registrar el cliente presencial.';
        this.actualizarVista();
      }
    });
  }

  private limpiarFormularioCliente(): void {
    this.nuevoCliente = {
      nombre: '',
      apellido: '',
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      telefono: '',
      correo: ''
    };
  }

  // PRODUCTOS
  get productosFiltrados(): Producto[] {
    const termino = this.busquedaProducto.trim().toLowerCase();
    if (!termino) return this.productos;

    return this.productos.filter(producto => {
      const texto = `${producto.nombre} ${producto.categoria?.nombreCategoria || ''} ${producto.genero?.nombreGenero || ''}`;
      return texto.toLowerCase().includes(termino);
    });
  }

  seleccionarProducto(producto: Producto): void {
    this.productoSeleccionado = producto;
    this.productoTallaSeleccionado = null;
    this.tallasProducto = [];
    this.cantidad = 1;
    this.mensajeError = '';
    this.cargarTallas(producto.idProducto);
  }

  quitarProducto(): void {
    this.productoSeleccionado = null;
    this.productoTallaSeleccionado = null;
    this.tallasProducto = [];
    this.busquedaProducto = '';
    this.cantidad = 1;
  }

  private cargarTallas(idProducto: number): void {
    this.cargandoTallas = true;
    this.productoTallaService.listarPorProducto(idProducto).subscribe({
      next: tallas => {
        this.tallasProducto = tallas.sort((a, b) => a.talla.idTalla - b.talla.idTalla);
        this.cargandoTallas = false;
        this.actualizarVista();
      },
      error: error => {
        console.error('Error cargando tallas:', error);
        this.tallasProducto = [];
        this.cargandoTallas = false;
        this.mensajeError = 'No se pudieron cargar las tallas del producto.';
        this.actualizarVista();
      }
    });
  }

  seleccionarTalla(productoTalla: ProductoTalla): void {
    if (Number(productoTalla.stock) <= 0) return;
    this.productoTallaSeleccionado = productoTalla;
    this.cantidad = 1;
    this.mensajeError = '';
  }

  // PRECIO
  obtenerPrecio(producto: Producto): number {
    const precioNormal = Number(producto.precio || 0);
    const precioOferta = Number(producto.precioOferta || 0);
    if (precioOferta > 0 && precioOferta < precioNormal) return precioOferta;
    return precioNormal;
  }

  // CARRITO POS
  agregarAlCarrito(): void {
    this.mensajeError = '';
    this.ventaRealizada = null;

    if (!this.productoSeleccionado) {
      this.mensajeError = 'Selecciona un producto.';
      return;
    }
    if (!this.productoTallaSeleccionado) {
      this.mensajeError = 'Selecciona una talla con stock.';
      return;
    }

    const cantidad = Number(this.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      this.mensajeError = 'La cantidad debe ser mayor que cero.';
      return;
    }

    const stock = Number(this.productoTallaSeleccionado.stock || 0);
    const existente = this.carrito.find(item => item.idProductoTalla === this.productoTallaSeleccionado?.idProductoTalla);
    const cantidadActual = existente ? existente.cantidad : 0;

    if (cantidadActual + cantidad > stock) {
      this.mensajeError = `Stock insuficiente. Disponible: ${stock}.`;
      return;
    }

    const precio = this.obtenerPrecio(this.productoSeleccionado);

    if (existente) {
      existente.cantidad += cantidad;
      existente.subtotal = existente.cantidad * existente.precio;
    } else {
      this.carrito.push({
        idProducto: this.productoSeleccionado.idProducto,
        idProductoTalla: this.productoTallaSeleccionado.idProductoTalla,
        nombre: this.productoSeleccionado.nombre,
        talla: this.productoTallaSeleccionado.talla.nombreTalla,
        precio,
        cantidad,
        stock,
        subtotal: precio * cantidad
      });
    }

    this.quitarProducto();
    this.actualizarVista();
  }

  aumentarCantidad(item: ItemVentaPos): void {
    if (item.cantidad >= item.stock) {
      this.mensajeError = `Stock máximo disponible para ${item.nombre} - ${item.talla}: ${item.stock}.`;
      return;
    }
    item.cantidad++;
    item.subtotal = item.cantidad * item.precio;
    this.mensajeError = '';
  }

  disminuirCantidad(item: ItemVentaPos): void {
    if (item.cantidad <= 1) return;
    item.cantidad--;
    item.subtotal = item.cantidad * item.precio;
    this.mensajeError = '';
  }

  eliminarItem(item: ItemVentaPos): void {
    this.carrito = this.carrito.filter(actual => actual.idProductoTalla !== item.idProductoTalla);
    this.mensajeError = '';
  }

  get totalVenta(): number {
    return this.carrito.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  }

  // REGISTRAR VENTA PRESENCIAL
  registrarVenta(): void {
    this.mensajeError = '';
    this.ventaRealizada = null;

    if (!this.clienteSeleccionado) {
      this.mensajeError = 'Selecciona un cliente presencial.';
      return;
    }
    if (this.carrito.length === 0) {
      this.mensajeError = 'Agrega al menos un producto a la venta.';
      return;
    }
    if (this.procesandoVenta) return;

    const itemsComprobante = this.carrito.map(item => ({ ...item }));
    const request: VentaPosRequest = {
      idClientePresencial: this.clienteSeleccionado.idClientePresencial,
      medioPago: this.medioPago,
      items: this.carrito.map(item => ({
        idProductoTalla: item.idProductoTalla,
        cantidad: item.cantidad
      }))
    };

    this.procesandoVenta = true;
    this.ventaService.realizarVentaPos(request).subscribe({
      next: venta => {
        this.ventaRealizada = venta;
        this.itemsVentaRealizada = itemsComprobante;
        this.procesandoVenta = false;
        this.carrito = [];
        this.productoSeleccionado = null;
        this.productoTallaSeleccionado = null;
        this.tallasProducto = [];
        this.busquedaProducto = '';
        this.actualizarVista();
      },
      error: error => {
        console.error('Error registrando venta POS:', error);
        this.procesandoVenta = false;
        this.mensajeError = error?.error?.message || error?.error || 'No se pudo registrar la venta. Revisa el stock e intenta nuevamente.';
        this.actualizarVista();
      }
    });
  }

  // IMPRIMIR COMPROBANTE
  imprimirComprobante(): void {
    if (!this.ventaRealizada) return;
    window.print();
  }

  // NUEVA VENTA
  nuevaVenta(): void {
    this.clienteSeleccionado = null;
    this.productoSeleccionado = null;
    this.productoTallaSeleccionado = null;
    this.carrito = [];
    this.tallasProducto = [];
    this.busquedaCliente = '';
    this.busquedaProducto = '';
    this.cantidad = 1;
    this.medioPago = 'EFECTIVO';
    this.mostrarFormularioCliente = false;
    this.registrandoCliente = false;
    this.mensajeError = '';
    this.ventaRealizada = null;
    this.itemsVentaRealizada = [];
    this.limpiarFormularioCliente();
    this.cargarClientes();
  }

  // VISTA
  private actualizarVista(): void {
    this.cdr.detectChanges();
  }
}