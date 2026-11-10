import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { TiendaService, TiendaConfig, TiendaConfigEditar } from '../../../core/services/tienda.service';

@Component({
  selector: 'app-configuracion-tienda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion-tienda.html',
  styleUrl: './configuracion-tienda.css'
})
export class ConfiguracionTienda implements OnInit {
  readonly tiendaService = inject(TiendaService);
  datos: TiendaConfigEditar = {
    nombre: '', colorPrimario: '#000000', colorSecundario: '#FFFFFF',
    telefonoSoporte: '', whatsapp: '', descripcionComercial: ''
  };
  guardando = false;
  subiendoLogo = false;
  error = '';
  exito = '';

  ngOnInit(): void {
    const actual = this.tiendaService.tiendaActual();
    if (actual) this.establecer(actual);
    else this.tiendaService.cargarConfiguracion().subscribe({
      next: t => this.establecer(t),
      error: () => this.error = 'No se pudo cargar la configuración de la tienda.'
    });
  }

  private establecer(t: TiendaConfig): void {
    this.datos = {
      nombre: t.nombre || '',
      colorPrimario: t.colorPrimario || '#000000',
      colorSecundario: t.colorSecundario || '#FFFFFF',
      telefonoSoporte: t.telefonoSoporte || '',
      whatsapp: t.whatsapp || '',
      descripcionComercial: t.descripcionComercial || ''
    };
  }

  guardar(): void {
    if (this.guardando || this.subiendoLogo) return;
    this.error = ''; this.exito = '';
    this.guardando = true;
    this.tiendaService.actualizarConfiguracion(this.datos)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: () => this.exito = 'Cambios guardados correctamente.',
        error: err => this.error = err.error?.detail || err.error?.message || 'No se pudo guardar la configuración.'
      });
  }

  seleccionarLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || this.subiendoLogo || this.guardando) return;
    if (archivo.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type)) {
      this.error = 'Utiliza PNG, JPG o WebP de máximo 2 MB.';
      return;
    }
    this.error = ''; this.exito = ''; this.subiendoLogo = true;
    this.tiendaService.subirLogo(archivo).pipe(finalize(() => this.subiendoLogo = false))
      .subscribe({
        next: () => this.exito = 'Logotipo actualizado correctamente.',
        error: err => this.error = err.error?.detail || err.error?.message || 'No se pudo subir el logotipo.'
      });
  }
}
