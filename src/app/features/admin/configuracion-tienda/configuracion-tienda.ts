import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  TiendaService,
  TiendaConfig,
  TiendaConfigEditar
} from '../../../core/services/tienda.service';

interface ColorMarca {
  nombre: string;
  principal: string;
  secundario: string;
}

@Component({
  selector: 'app-configuracion-tienda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion-tienda.html',
  styleUrl: './configuracion-tienda.css'
})
export class ConfiguracionTienda implements OnInit {

  readonly tiendaService = inject(TiendaService);

  readonly paletas: ColorMarca[] = [
    {
      nombre: 'Elegante',
      principal: '#292524',
      secundario: '#F5EDE5'
    },
    {
      nombre: 'Boutique',
      principal: '#9B6148',
      secundario: '#F8EEE8'
    },
    {
      nombre: 'Rosado',
      principal: '#B64075',
      secundario: '#FFF0F6'
    },
    {
      nombre: 'Natural',
      principal: '#376D60',
      secundario: '#EEF7F2'
    },
    {
      nombre: 'Moderno',
      principal: '#415BA9',
      secundario: '#EFF3FF'
    }
  ];

  datos: TiendaConfigEditar = {
    nombre: '',
    colorPrimario: '#292524',
    colorSecundario: '#FFFFFF',
    telefonoSoporte: '',
    whatsapp: '',
    descripcionComercial: ''
  };

  cargando = true;
  guardando = false;
  subiendoLogo = false;

  error = '';
  exito = '';

  ngOnInit(): void {
    const actual = this.tiendaService.tiendaActual();

    if (actual) {
      this.establecer(actual);
      this.cargando = false;
      return;
    }

    this.tiendaService.cargarConfiguracion().subscribe({
      next: tienda => {
        this.establecer(tienda);
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la configuración.';
        this.cargando = false;
      }
    });
  }

  private establecer(t: TiendaConfig): void {
    this.datos = {
      nombre: t.nombre || '',
      colorPrimario: t.colorPrimario || '#292524',
      colorSecundario: t.colorSecundario || '#FFFFFF',
      telefonoSoporte: t.telefonoSoporte || '',
      whatsapp: t.whatsapp || '',
      descripcionComercial: t.descripcionComercial || ''
    };
  }

  usarPaleta(paleta: ColorMarca): void {
    this.datos.colorPrimario = paleta.principal;
    this.datos.colorSecundario = paleta.secundario;
    this.exito = '';
  }

  get nombreVista(): string {
    return this.datos.nombre.trim() || 'Mi tienda';
  }

  get descripcionVista(): string {
    return this.datos.descripcionComercial.trim()
      || 'Descubre nuestros productos y novedades.';
  }

  get principalVista(): string {
    return this.colorSeguro(this.datos.colorPrimario, '#292524');
  }

  get secundarioVista(): string {
    return this.colorSeguro(this.datos.colorSecundario, '#FFFFFF');
  }

  get textoSobrePrincipal(): string {
    const color = this.principalVista.replace('#', '');

    const r = parseInt(color.slice(0, 2), 16) / 255;
    const g = parseInt(color.slice(2, 4), 16) / 255;
    const b = parseInt(color.slice(4, 6), 16) / 255;

    const lineal = (v: number): number =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

    const luminosidad =
      0.2126 * lineal(r) +
      0.7152 * lineal(g) +
      0.0722 * lineal(b);

    return luminosidad > 0.179 ? '#171717' : '#FFFFFF';
  }

  private colorSeguro(valor: string, respaldo: string): string {
    return /^#[0-9a-fA-F]{6}$/.test(valor || '')
      ? valor
      : respaldo;
  }

  guardar(): void {
    if (this.guardando || this.subiendoLogo || this.cargando) {
      return;
    }

    this.error = '';
    this.exito = '';

    if (!this.datos.nombre.trim()) {
      this.error = 'Ingresa el nombre comercial.';
      return;
    }

    this.guardando = true;

    const solicitud: TiendaConfigEditar = {
      ...this.datos,
      nombre: this.datos.nombre.trim(),
      descripcionComercial: this.datos.descripcionComercial.trim(),
      colorPrimario: this.principalVista,
      colorSecundario: this.secundarioVista
    };

    this.tiendaService.actualizarConfiguracion(solicitud)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: configuracion => {
          this.establecer(configuracion);
          this.exito = 'Personalización guardada correctamente.';
        },
        error: err => {
          this.error = err.error?.detail
            || err.error?.message
            || 'No se pudo guardar la configuración.';
        }
      });
  }

  seleccionarLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    input.value = '';

    if (!archivo || this.subiendoLogo || this.guardando) {
      return;
    }

    const tipos = ['image/png', 'image/jpeg', 'image/webp'];

    if (archivo.size === 0 ||
        archivo.size > 2 * 1024 * 1024 ||
        !tipos.includes(archivo.type)) {
      this.error = 'Utiliza PNG, JPG o WebP de máximo 2 MB.';
      return;
    }

    this.error = '';
    this.exito = '';
    this.subiendoLogo = true;

    // El logo se sube independientemente del formulario.
    this.tiendaService.subirLogo(archivo)
      .pipe(finalize(() => this.subiendoLogo = false))
      .subscribe({
        next: () => {
          this.exito = 'Logotipo actualizado correctamente.';
        },
        error: err => {
          this.error = err.error?.detail
            || err.error?.message
            || 'No se pudo subir el logotipo.';
        }
      });
  }

  restaurarVista(): void {
    const guardada = this.tiendaService.tiendaActual();

    if (!guardada) {
      return;
    }

    this.establecer(guardada);
    this.error = '';
    this.exito = 'Vista previa restaurada a la última configuración cargada.';
  }
}