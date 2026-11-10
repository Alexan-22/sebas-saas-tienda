import { TransferenciasService, CuentaBancaria } from '../../core/services/transferencias.service';
import { claveTransferencia, completarIntentoTransferencia } from './transferencia-idempotencia';

import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CarritoService } from '../../core/services/carrito';
import { VentaService } from '../../core/services/venta';
import { ProductoTallaService } from '../../core/services/producto-talla';
import { CompraRequest, CompraResponse } from '../../core/models/venta';
import { DatosCheckout, MetodoPago } from '../../core/models/checkout';
import { YapeService } from '../../core/services/yape.service';
import { ProductoTalla } from '../../core/models/producto-talla';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { claveYape, completarIntentoYape } from './yape-idempotencia';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink, PromoBar, Navbar, Footer],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly items;
  readonly subtotal;

  readonly departamentos = [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
    'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
    'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
    'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
    'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ];


  yapeDisponible = false;
  cuentas: CuentaBancaria[] = [];
  cuentaBancariaId: number | null = null;
  procesando = false;
  error = '';
  pagoYapeConfirmado = false;
  aceptaTerminos = false;

  datos: DatosCheckout = {
    nombres: '',
    apellidos: '',
    telefono: '',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: '',
    direccion: '',
    referencia: '',
    metodoPago: 'YAPE'
  };

  constructor(
    public carritoService: CarritoService,
    private ventaService: VentaService,
    private productoTallaService: ProductoTallaService,
    private transferencias: TransferenciasService,
    private yapeService: YapeService,
    private router: Router
  ) {
    this.items = carritoService.items;
    this.subtotal = carritoService.subtotal;

    this.transferencias.cuentasPublicas().subscribe({next:cuentas=>{this.cuentas=cuentas;this.cdr.markForCheck();},error:e=>{this.cuentas=[];this.error=`No se pudieron consultar bancos (HTTP ${e.status}).`;this.cdr.markForCheck();}});

    this.yapeService.publico().subscribe({
      next: config => {
        // Solo habilitar Yape cuando el backend publica los tres datos.
        this.yapeDisponible =
          !!config.habilitado && !!config.numeroYape && !!config.qrUrl;

        console.info('Configuración pública Yape:', {
          habilitado: !!config.habilitado,
          tieneNumero: !!config.numeroYape,
          tieneQr: !!config.qrUrl
        });
        this.cdr.markForCheck();
      },
      error: err => {
        console.warn('No se pudo cargar la configuración Yape. HTTP:', err.status);
        this.yapeDisponible = false;
        this.cdr.markForCheck();
      }
    });

    if (this.items().length === 0) {
      void this.router.navigate(['/carrito']);
    }
  }

  normalizarTelefono(): void {
    this.datos.telefono = this.datos.telefono.replace(/\D/g, '').slice(0, 9);
  }

  cambiarDepartamento(): void {

    this.datos.provincia = '';
    this.datos.distrito = '';
  }

  get costoDeliveryEstimado(): number {
    const departamento = this.normalizarTexto(this.datos.departamento);
    const provincia = this.normalizarTexto(this.datos.provincia);

    if (!departamento || !provincia) return 0;
    return departamento === 'lima' && provincia === 'lima' ? 10 : 20;
  }

  get totalEstimado(): number {
    return this.subtotal() + this.costoDeliveryEstimado;
  }

  seleccionarPago(metodo: MetodoPago): void {
    if (metodo === 'YAPE' && !this.yapeDisponible) {
      this.error = 'Yape no está habilitado para esta tienda.';
      return;
    }
    if(metodo==='TRANSFERENCIA' && !this.cuentas.length){this.error='No hay cuentas bancarias habilitadas.';return;}

    this.datos.metodoPago = metodo;
    this.error = '';
    if (metodo !== 'YAPE') this.pagoYapeConfirmado = false;
  }

  continuarPago(): void {
    if (this.procesando) return;

    if (this.datos.metodoPago === 'YAPE' && !this.yapeDisponible) {
      this.error = 'Yape no está habilitado para esta tienda. No realices un depósito.';
      return;
    }
    if(this.datos.metodoPago==='TRANSFERENCIA' && !this.cuentas.some(c=>c.id===this.cuentaBancariaId)){this.error='Selecciona una cuenta bancaria habilitada.';return;}

    this.error = '';
    if (
      !this.datos.nombres.trim() ||
      !this.datos.apellidos.trim() ||
      !this.datos.telefono.trim() ||
      !this.datos.departamento.trim() ||
      !this.datos.provincia.trim() ||
      !this.datos.distrito.trim() ||
      !this.datos.direccion.trim()
    ) {
      this.error = 'Completa los datos obligatorios de entrega.';
      return;
    }

    if (!/^9\d{8}$/.test(this.datos.telefono.trim())) {
      this.error = 'Ingresa un celular peruano válido de 9 dígitos.';
      return;
    }


    if (!this.aceptaTerminos) {
      this.error = 'Debes aceptar los términos y condiciones para continuar.';
      return;
    }
    if (this.items().length === 0) {
      this.error = 'El carrito está vacío.';
      return;
    }

    // Los reintentos Yape llegan al servidor con la misma clave idempotente,
    // incluso si el primer intento ya reservó la última unidad.
    if (this.datos.metodoPago === 'YAPE' || this.datos.metodoPago === 'TRANSFERENCIA') {
      this.procesando = true;
      this.registrarCompra();
      return;
    }
    this.validarStockAntesDeComprar();
  }

  private validarStockAntesDeComprar(): void {
    const itemsActuales = this.carritoService.items();
    if (itemsActuales.length === 0) {
      this.error = 'El carrito está vacío.';
      return;
    }

    this.procesando = true;
    this.error = '';
    this.cdr.markForCheck();

    const productosUnicos = [...new Set(itemsActuales.map(item => item.idProducto))];
    const consultas = productosUnicos.map(idProducto =>
      this.productoTallaService.listarPorProducto(idProducto).pipe(
        catchError(error => {
          console.error('Error consultando stock del producto:', idProducto, error);
          return of(null as ProductoTalla[] | null);
        })
      )
    );

    forkJoin(consultas).subscribe({
      next: respuestas => {
        const consultaFallida = respuestas.some(respuesta => respuesta === null);
        if (consultaFallida) {
          this.procesando = false;
          this.error = 'No se pudo verificar el stock. Intenta nuevamente.';
          this.cdr.markForCheck();
          return;
        }

        const tallas = respuestas
          .filter((respuesta): respuesta is ProductoTalla[] => respuesta !== null)
          .flat();

        let stockModificado = false;
        let productoNoDisponible = false;

        for (const item of itemsActuales) {
          const productoTalla = tallas.find(
            talla => talla.idProductoTalla === item.idProductoTalla
          );
          if (!productoTalla) {
            productoNoDisponible = true;
            continue;
          }

          const stockActual = Math.max(0, productoTalla.stock);
          if (stockActual !== item.stock || item.cantidad > stockActual) {
            stockModificado = true;
          }
          if (stockActual <= 0) productoNoDisponible = true;

          this.carritoService.actualizarStock(item.idProductoTalla, stockActual);
        }

        if (productoNoDisponible) {
          this.procesando = false;
          this.error = 'Uno o más productos no tienen stock. Revisa el carrito antes de continuar.';
          this.cdr.markForCheck();
          return;
        }
        if (stockModificado) {
          this.procesando = false;
          this.error = 'El stock del carrito cambió. Revisa las cantidades antes de continuar.';
          this.cdr.markForCheck();
          return;
        }
        this.registrarCompra();
      },
      error: error => {
        console.error('Error verificando stock:', error);
        this.procesando = false;
        this.error = 'No se pudo verificar el stock. Intenta nuevamente.';
        this.cdr.markForCheck();
      }
    });
  }

  private registrarCompra(): void {
    const itemsActuales = this.carritoService.items();
    if (itemsActuales.length === 0) {
      this.procesando = false;
      this.error = 'El carrito está vacío.';
      this.cdr.markForCheck();
      return;
    }

    const request: CompraRequest = {
      items: itemsActuales.map(item => ({
        idProductoTalla: item.idProductoTalla,
        cantidad: item.cantidad
      })),
      medioPago: this.datos.metodoPago,
      direccionEnvio: {
        departamento: this.datos.departamento.trim(),
        provincia: this.datos.provincia.trim(),
        distrito: this.datos.distrito.trim(),
        direccionExacta: this.datos.direccion.trim(),
        referencia: this.datos.referencia.trim()
      }
    };

    if (request.medioPago === 'YAPE') {
      request.claveIdempotencia = claveYape(request);
    }

    if(request.medioPago==='TRANSFERENCIA') {request.cuentaBancariaId=this.cuentaBancariaId!;request.claveIdempotencia=claveTransferencia(request);}
    this.ventaService.comprar(request).subscribe({
      next: (response: CompraResponse) => {
        this.procesando = false;
        const cliente = { ...this.datos };
        this.carritoService.vaciar();
        this.cdr.markForCheck();

        if (response.medioPago === 'YAPE') {
          completarIntentoYape();
          void this.router.navigate(['/yape/pendiente', response.idVenta]);
          return;
        }

        if(response.medioPago==='TRANSFERENCIA'){completarIntentoTransferencia();void this.router.navigate(['/transferencia/pendiente',response.idVenta]);return;}
        void this.router.navigate(['/compra-exitosa'], {
          state: { compra: response, cliente }
        });
      },
      error: error => {
        console.error('Error realizando compra:', error);
        this.procesando = false;

        if (error.status === 401) {
          this.error = 'Tu sesión ha expirado. Inicia sesión nuevamente.';
        } else if (error.status === 403) {
          this.error = 'No tienes autorización para realizar esta operación.';
        } else if (error.status === 409) {
          this.error = error?.error?.message ??
            'El stock o los datos de la compra cambiaron. Revisa tu pedido.';
        } else {
          this.error = typeof error.error === 'string'
            ? error.error
            : error?.error?.message ?? 'No se pudo registrar la compra.';
        }
        this.cdr.markForCheck();
      }
    });
  }

  private normalizarTexto(valor: string): string {
    return valor
      .trim()
      .toLocaleLowerCase('es-PE')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
