import { Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PaginasAyudaService } from '../../core/services/paginas-ayuda.service';
import { Footer } from '../../shared/components/footer/footer';
import type { ClavePaginaAyuda } from '../../core/services/editor-tienda.service';

@Component({
  selector: 'app-pagina-ayuda-publica', standalone: true,
  imports: [RouterLink, Footer],
  template: `
    <main class="pagina-ayuda">
      <a routerLink="/" class="volver">â† Volver a la tienda</a>
      @if (paginas.cargando()) {
        <p role="status">Cargando informaciÃ³n...</p>
      } @else if (pagina(); as actual) {
        <article>
          <span class="etiqueta">INFORMACIÃ“N DE LA TIENDA</span>
          <h1>{{ actual.titulo }}</h1>
          <div class="contenido">{{ actual.contenido }}</div>
        </article>
      } @else {
        <h1>InformaciÃ³n no disponible</h1>
        <p>Esta pÃ¡gina no estÃ¡ publicada en esta tienda.</p>
      }
    </main>
    <app-footer />
  `,
  styles: [`
    :host { display:block; }
    .pagina-ayuda { max-width:900px; min-height:45vh; margin:auto; padding:65px 24px 95px; color:#252525; }
    .volver { display:inline-block; margin-bottom:44px; color:#555; text-decoration:none; }
    .etiqueta { font:700 11px Inter,Arial,sans-serif; letter-spacing:.17em; color:#7c6b60; }
    h1 { font:400 clamp(32px,5vw,52px) Georgia,serif; margin:14px 0 32px; }
    .contenido { white-space:pre-wrap; overflow-wrap:anywhere; font:400 16px/1.95 Inter,Arial,sans-serif; }
    p { line-height:1.8; }
  `]
})
export class PaginaAyudaPublica implements OnInit {
  readonly paginas = inject(PaginasAyudaService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly clave = toSignal(this.ruta.paramMap.pipe(map(m => m.get('clave')?.toUpperCase() ?? '')),
    { initialValue: '' });
  readonly pagina = computed(() => this.paginas.paginas().find(
    p => p.clave === this.clave() as ClavePaginaAyuda && p.visible && p.clave !== 'RECLAMACIONES'
  ));
  ngOnInit(): void { this.paginas.cargar(); }
}