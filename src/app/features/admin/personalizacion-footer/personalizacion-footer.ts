import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FooterConfig, FooterTiendaService } from '../../../core/services/footer-tienda.service';
import { TiendaService } from '../../../core/services/tienda.service';

@Component({
  selector: 'app-personalizacion-footer', standalone: true, imports: [FormsModule],
  templateUrl: './personalizacion-footer.html', styleUrl: './personalizacion-footer.css'
})
export class PersonalizacionFooter implements OnInit {
  readonly service = inject(FooterTiendaService);
  readonly tienda = inject(TiendaService);
  private readonly cdr = inject(ChangeDetectorRef);
  formulario: FooterConfig = structuredClone(this.service.configuracion());
  cargando = true;
  guardando = false;
  error = '';
  exito = '';
  get nombre(): string { return this.tienda.tiendaActual()?.nombre || 'Mi tienda'; }
  get color(): string { return this.tienda.tiendaActual()?.colorPrimario || '#171717'; }
  ngOnInit(): void {
    this.service.consultarAdmin().subscribe({
      next: v => { this.formulario = structuredClone(v); this.cargando = false; this.cdr.markForCheck(); },
      error: e => { this.cargando = false; this.error = `No se pudo cargar el footer (HTTP ${e.status}). Comprueba la tabla SQL y reinicia Spring Boot.`; this.cdr.markForCheck(); }
    });
  }
  restaurar(): void {this.formulario=structuredClone(this.service.configuracion());this.error='';this.exito='';}
  private urlValida(url: string, dominios: string[]): boolean {
    if (!url.trim()) return true;
    try {
      const u = new URL(url.trim());
      return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
        dominios.some(d => u.hostname.toLowerCase() === d || u.hostname.toLowerCase() === `www.${d}`);
    } catch {return false;}
  }
  guardar(): void {
    this.error='';this.exito='';
    if (!this.urlValida(this.formulario.facebookUrl,['facebook.com','fb.com']) ||
        !this.urlValida(this.formulario.instagramUrl,['instagram.com']) ||
        !this.urlValida(this.formulario.tiktokUrl,['tiktok.com'])) {
      this.error='Las direcciones deben ser HTTPS de Facebook, Instagram o TikTok, según corresponda.'; return;
    }
    if (this.guardando || this.cargando) return;
    this.guardando = true;
    const limpiar = structuredClone(this.formulario);
    for (const clave of Object.keys(limpiar) as Array<keyof FooterConfig>) {
      const val = limpiar[clave];
      if (typeof val === 'string') (limpiar as unknown as Record<string, unknown>)[clave] = val.trim();
    }
    this.service.guardar(limpiar).subscribe({
      next: v => {this.formulario=structuredClone(v);this.guardando=false;this.exito='Footer guardado. La tienda pública mostrará los cambios al recargar.';this.cdr.markForCheck();},
      error: e => {this.guardando=false;this.error=e.error?.detail || `Error al guardar (HTTP ${e.status}).`;this.cdr.markForCheck();}
    });
  }
}
