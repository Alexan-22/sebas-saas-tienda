import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Resumen {
  numeroHoja: number;
  recibidoEn: string;
  tipo: string;
  consumidorNombre: string;
  estado: string;
}
interface Hoja {
  numeroHoja: number; recibidoEn: string; tipo: string;
  consumidorNombre: string; documentoTipo: string; documentoNumero: string;
  domicilio: string; correo: string | null; telefono: string | null;
  bienTipo: string; bienDescripcion: string; montoReclamado: number | null;
  detalle: string; pedido: string;
}
interface Evento { creadoEn: string; tipo: string; contenido: string; actor: string; estado: string | null; }
interface Detalle { hoja: Hoja; eventos: Evento[]; }

@Component({
  selector: 'app-admin-reclamaciones',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <section class="libro-admin">
      <header><h1>Libro de Reclamaciones</h1><p>Consulta privada de reclamaciones de esta tienda.</p></header>
      <div class="toolbar"><button type="button" (click)="cargar()" [disabled]="cargando()">Actualizar</button></div>
      @if (cargando()) { <p role="status">Cargando reclamaciones…</p> }
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (!cargando() && !error() && registros().length === 0) { <p>No hay reclamaciones registradas.</p> }
      @if (registros().length) {
        <div class="tabla-wrap"><table><thead><tr><th>Hoja</th><th>Fecha</th><th>Tipo</th><th>Consumidor</th><th>Estado</th><th></th></tr></thead>
        <tbody>@for (r of registros(); track r.numeroHoja) {
          <tr><td>#{{r.numeroHoja}}</td><td>{{r.recibidoEn | date:'dd/MM/yyyy HH:mm'}}</td><td>{{r.tipo}}</td><td>{{r.consumidorNombre}}</td><td>{{r.estado}}</td>
          <td><button type="button" (click)="ver(r.numeroHoja)">Ver</button></td></tr>
        }</tbody></table></div>
      }
      @if (detalle()) {
        <article class="detalle"><div class="cabecera"><h2>Hoja #{{detalle()!.hoja.numeroHoja}}</h2><button type="button" (click)="detalle.set(null)">Cerrar</button></div>
          <dl><dt>Consumidor</dt><dd>{{detalle()!.hoja.consumidorNombre}}</dd>
          <dt>Documento</dt><dd>{{detalle()!.hoja.documentoTipo}} {{detalle()!.hoja.documentoNumero}}</dd>
          <dt>Domicilio</dt><dd>{{detalle()!.hoja.domicilio}}</dd>
          <dt>Contacto</dt><dd>{{detalle()!.hoja.correo || '—'}} / {{detalle()!.hoja.telefono || '—'}}</dd>
          <dt>Bien</dt><dd>{{detalle()!.hoja.bienTipo}} · {{detalle()!.hoja.bienDescripcion}}</dd>
          <dt>Detalle</dt><dd>{{detalle()!.hoja.detalle}}</dd>
          <dt>Pedido</dt><dd>{{detalle()!.hoja.pedido}}</dd></dl>
          <h3>Historial</h3>
          @for (e of detalle()!.eventos; track $index) {
            <p class="evento"><strong>{{e.tipo}}</strong> — {{e.creadoEn | date:'dd/MM/yyyy HH:mm'}}: {{e.contenido}}</p>
          }
          <section class="nota-interna">
            <h3>Nota interna de seguimiento</h3>
            <label for="nota-reclamo">Nota (no se envía al consumidor)</label>
            <textarea id="nota-reclamo" [ngModel]="nota()" (ngModelChange)="nota.set($event)" maxlength="4000" rows="4"></textarea>
            <button type="button" (click)="guardarNota()" [disabled]="guardandoNota() || !nota().trim()">{{ guardandoNota() ? 'Guardando…' : 'Guardar nota' }}</button>
            @if (mensajeNota()) { <p role="status">{{ mensajeNota() }}</p> }
          </section>
          <p class="nota">Las notas internas no sustituyen una respuesta formal comunicada al consumidor.</p>
        </article>
      }
    </section>`,
  styles: [`
    :host{display:block}.libro-admin{max-width:1100px;margin:auto;padding:12px 0 48px;color:#242424}
    h1{font-size:27px;margin:0 0 8px}header p{color:#666}.toolbar{margin:20px 0}
    button{border:1px solid #999;background:white;border-radius:7px;padding:8px 14px;cursor:pointer}
    button:disabled{opacity:.5;cursor:default}.error{background:#fff3ef;color:#8b1e10;border:1px solid #e8b1a6;border-radius:7px;padding:15px}
    .tabla-wrap{overflow:auto}table{width:100%;border-collapse:collapse;background:white}th,td{padding:13px;text-align:left;border-bottom:1px solid #e6e6e6}
    th{font-size:13px;color:#555}.detalle{margin-top:28px;border:1px solid #ddd;border-radius:12px;background:white;padding:23px}
    .cabecera{display:flex;align-items:center;justify-content:space-between;gap:10px}.cabecera h2{margin:0}
    dl{display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:11px;margin:25px 0}dt{font-weight:bold}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
    .evento{padding:9px;border-bottom:1px solid #eee}.nota{font-size:13px;color:#666}
    .nota-interna{border-top:1px solid #ddd;padding-top:12px}.nota-interna textarea{display:block;width:100%;box-sizing:border-box;margin:8px 0 12px;padding:10px;max-width:100%;border:1px solid #aaa;border-radius:6px}
    @media(max-width:600px){dl{grid-template-columns:1fr;gap:4px}dd{margin-bottom:12px}}
  `]
})
export class ReclamacionesAdmin implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/reclamaciones/admin`;
  readonly registros = signal<Resumen[]>([]);
  readonly detalle = signal<Detalle | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly nota = signal('');
  readonly guardandoNota = signal(false);
  readonly mensajeNota = signal('');
  ngOnInit(): void { this.cargar(); }
  cargar(): void {
    this.cargando.set(true); this.error.set('');
    this.http.get<Resumen[]>(this.base, {params:{limite:30}}).subscribe({
      next: rows => {this.registros.set(rows); this.cargando.set(false);},
      error: (err: HttpErrorResponse) => {this.cargando.set(false); this.error.set(err.status===404 || err.status===500 ? 'La API o las tablas del Libro de Reclamaciones todavía no están disponibles en este entorno.' : err.status===401 || err.status===403 ? 'Sesión o permisos insuficientes. Ingresa como administrador de esta tienda.' : 'No se pudieron cargar las reclamaciones. Verifica el backend.');}
    });
  }
  ver(numeroHoja: number): void {
    this.detalle.set(null);
    this.nota.set(''); this.mensajeNota.set('');
    this.http.get<Detalle>(`${this.base}/${numeroHoja}`).subscribe({
      next: d => this.detalle.set(d),
      error: () => this.error.set('No se pudo consultar la hoja solicitada.')
    });
  }
  guardarNota(): void {
    const hoja = this.detalle()?.hoja.numeroHoja;
    const texto = this.nota().trim();
    if (!hoja || !texto || texto.length > 4000 || this.guardandoNota()) return;
    this.guardandoNota.set(true); this.mensajeNota.set('');
    this.http.post<void>(`${this.base}/${hoja}/notas`, {texto}).subscribe({
      next: () => {
        this.guardandoNota.set(false); this.nota.set('');
        this.mensajeNota.set('Nota guardada, sin notificación al consumidor.');
        this.ver(hoja);
      },
      error: () => { this.guardandoNota.set(false); this.mensajeNota.set('No se pudo guardar la nota.'); }
    });
  }

}
