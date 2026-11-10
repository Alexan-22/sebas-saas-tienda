import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';
import { YapeConfiguracion, YapeService } from '../../../core/services/yape.service';

@Component({
  selector: 'app-yape-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './yape.html'
})
export class YapeAdmin implements OnInit, OnDestroy {
  private readonly api = inject(YapeService);
  private readonly maxBytes = 2 * 1024 * 1024;
  private archivoSeleccionado: File | null = null;
  private urlTemporal: string | null = null;
  private urlServidor: string | null = null;
  private habilitadoPersistido = false;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly vistaPrevia = signal<string | null>(null);
  readonly qrGuardado = signal(false);
  readonly archivoNombre = signal('');

  form: YapeConfiguracion = {
    habilitado: false,
    numeroYape: null,
    titularYape: null,
    qrUrl: null
  };

  ngOnInit(): void { this.cargar(); }

  ngOnDestroy(): void { this.liberarURLs(); }

  get estadoTexto(): string {
    const numero = (this.form.numeroYape ?? '').trim();
    const titular = (this.form.titularYape ?? '').trim();
    const completo = /^9\d{8}$/.test(numero) && titular.length > 0 &&
      (this.qrGuardado() || this.archivoSeleccionado !== null);
    if (!completo) return 'Sin configurar';
    return this.form.habilitado
      ? (this.habilitadoPersistido ? 'Habilitado' : 'Habilitado (pendiente de guardar)')
      : 'Deshabilitado';
  }

  get configuracionCompleta(): boolean {
    return /^9\d{8}$/.test((this.form.numeroYape ?? '').trim()) &&
      !!(this.form.titularYape ?? '').trim() &&
      (this.qrGuardado() || this.archivoSeleccionado !== null);
  }

  normalizarNumero(valor: string): void {
    this.form.numeroYape = (valor ?? '').replace(/\D/g, '').slice(0, 9);
  }

  seleccionarArchivo(event: Event): void {
    this.error.set('');
    this.mensaje.set('');
    const control = event.target as HTMLInputElement;
    const archivo = control.files?.[0];
    if (!archivo) return;
    // La verificación real se repite en el servidor, sin confiar en el navegador.
    if (!['image/png', 'image/jpeg'].includes(archivo.type)) {
      this.error.set('Selecciona una imagen PNG o JPG.');
      control.value = '';
      return;
    }
    if (archivo.size < 1 || archivo.size > this.maxBytes) {
      this.error.set('El archivo debe pesar como máximo 2 MB.');
      control.value = '';
      return;
    }
    if (this.urlTemporal) URL.revokeObjectURL(this.urlTemporal);
    this.archivoSeleccionado = archivo;
    this.archivoNombre.set(archivo.name);
    this.urlTemporal = URL.createObjectURL(archivo);
    this.vistaPrevia.set(this.urlTemporal);
    control.value = '';
  }

  cargar(): void {
    if (this.guardando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.api.configuracionAdmin().subscribe({
      next: configuracion => {
        this.form = { ...configuracion };
        this.habilitadoPersistido = configuracion.habilitado;
        this.archivoSeleccionado = null;
        this.archivoNombre.set('');
        if (this.urlTemporal) URL.revokeObjectURL(this.urlTemporal);
        this.urlTemporal = null;
        this.qrGuardado.set(configuracion.qrUrl === '/api/yape/qr');
        if (this.qrGuardado()) {
          this.cargarImagenServidor();
        } else {
          if (this.urlServidor) URL.revokeObjectURL(this.urlServidor);
          this.urlServidor = null;
          this.vistaPrevia.set(null);
          this.cargando.set(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.errorHttp(err));
      }
    });
  }

  private cargarImagenServidor(): void {
    this.api.obtenerQrAdmin().subscribe({
      next: imagen => {
        if (this.urlServidor) URL.revokeObjectURL(this.urlServidor);
        this.urlServidor = URL.createObjectURL(imagen);
        this.vistaPrevia.set(this.urlServidor);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.errorHttp(err));
      }
    });
  }

  guardar(): void {
    if (this.guardando() || this.cargando()) return;
    this.error.set('');
    this.mensaje.set('');
    const numero = (this.form.numeroYape ?? '').trim();
    const titular = (this.form.titularYape ?? '').trim();
    if (numero && !/^9\d{8}$/.test(numero)) {
      this.error.set('El número Yape debe tener 9 dígitos y empezar por 9.');
      return;
    }
    if (titular.length > 120) {
      this.error.set('El nombre del titular no puede superar 120 caracteres.');
      return;
    }
    if (this.form.habilitado && !this.configuracionCompleta) {
      this.error.set('Para habilitar Yape completa número, titular y carga tu QR.');
      return;
    }
    const imagen = this.archivoSeleccionado;
    const datos: YapeConfiguracion = {
      habilitado: this.form.habilitado,
      numeroYape: numero || null,
      titularYape: titular || null,
      qrUrl: null // Se determina exclusivamente en el backend.
    };
    this.guardando.set(true);
    const subida: Observable<YapeConfiguracion | null> = imagen
      ? this.api.subirQr(imagen)
      : of(null);
    subida.pipe(switchMap(() => this.api.guardarConfiguracion(datos))).subscribe({
      next: configuracion => {
        this.form = { ...configuracion };
        this.habilitadoPersistido = configuracion.habilitado;
        this.archivoSeleccionado = null;
        this.archivoNombre.set('');
        this.qrGuardado.set(configuracion.qrUrl === '/api/yape/qr');
        this.guardando.set(false);
        this.mensaje.set('Configuración guardada para esta tienda. Los cobros requieren verificación manual.');
        if (this.qrGuardado()) this.cargarImagenServidor();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(this.errorHttp(err) + ' Si la imagen se subió, puedes volver a cargar para comprobarlo.');
      }
    });
  }

  private liberarURLs(): void {
    if (this.urlTemporal) URL.revokeObjectURL(this.urlTemporal);
    if (this.urlServidor) URL.revokeObjectURL(this.urlServidor);
    this.urlTemporal = null;
    this.urlServidor = null;
  }

  private errorHttp(err: HttpErrorResponse): string {
    if (err.status === 0) return 'No hay conexión con el backend local.';
    if (err.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (err.status === 403) return 'No tienes permisos ADMIN para esta tienda.';
    if (err.status === 404) return 'El recurso Yape no está disponible.';
    if (err.status === 413) return 'La imagen supera el límite de subida del servidor (2 MB).';
    if (err.status === 400) return 'Revisa el número, titular y archivo QR PNG/JPG.';
    if (err.status >= 500) return 'No se pudo completar la operación en el servidor. Inténtalo nuevamente.';
    return 'No se pudo completar la operación de Yape.';
  }
}

