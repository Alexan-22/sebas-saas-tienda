import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, switchMap, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoSeguimiento = 'PENDIENTE' | 'PREPARANDO' | 'DESPACHADO' |
  'EN_TRANSITO' | 'DISPONIBLE_RETIRO' | 'ENTREGADO' | 'INCIDENCIA' | 'CANCELADO';

export interface SeguimientoCliente {
  idVenta: number;
  operador: 'SHALOM' | 'OLVA' | 'PROPIO';
  modalidad: 'AGENCIA' | 'DOMICILIO';
  estado: EstadoSeguimiento;
  numeroGuia: string | null;
  codigoRastreo: string | null;
  actualizadoEn: string;
}

type Resultado =
  | { tipo: 'ok'; seguimiento: SeguimientoCliente }
  | { tipo: 'sin-guia' }
  | { tipo: 'sin-permiso' }
  | { tipo: 'error' }
  | { tipo: 'id-invalido' };

@Component({
  selector: 'app-seguimiento-pedido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seguimiento-pedido.html',
  styleUrl: './seguimiento-pedido.css'
})
export class SeguimientoPedido implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ruta = `${environment.apiUrl}/api/ventas`;

  readonly cargando = signal(true);
  readonly resultado = signal<Resultado | null>(null);
  readonly etapas: EstadoSeguimiento[] = [
    'PENDIENTE', 'PREPARANDO', 'DESPACHADO', 'EN_TRANSITO', 'ENTREGADO'
  ];

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(p => Number(p.get('id'))),
      distinctUntilChanged(),
      switchMap(id => {
        this.cargando.set(true);
        this.resultado.set(null);
        if (!Number.isSafeInteger(id) || id < 1) {
          return of({ tipo: 'id-invalido' } as const);
        }
        return this.http.get<SeguimientoCliente>(`${this.ruta}/${id}/envio`).pipe(
          map(seguimiento => ({ tipo: 'ok', seguimiento } as const)),
          catchError((err: HttpErrorResponse) => {
            if (err.status === 404) return of({ tipo: 'sin-guia' } as const);
            if (err.status === 401 || err.status === 403) return of({ tipo: 'sin-permiso' } as const);
            return of({ tipo: 'error' } as const);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(r => {
      this.resultado.set(r);
      this.cargando.set(false);
    });
  }

  tituloEstado(estado: EstadoSeguimiento): string {
    switch (estado) {
      case 'PENDIENTE': return 'Pendiente de preparación';
      case 'PREPARANDO': return 'Preparando pedido';
      case 'DESPACHADO': return 'Despachado';
      case 'EN_TRANSITO': return 'En tránsito';
      case 'DISPONIBLE_RETIRO': return 'Disponible para recojo';
      case 'ENTREGADO': return 'Entregado';
      case 'INCIDENCIA': return 'Incidencia en el envío';
      case 'CANCELADO': return 'Envío cancelado';
    }
  }

  nombreOperador(op: SeguimientoCliente['operador']): string {
    return op === 'SHALOM' ? 'Shalom' : op === 'OLVA' ? 'Olva Courier' : 'Reparto propio';
  }

  etapaCumplida(estado: EstadoSeguimiento, etapa: EstadoSeguimiento): boolean {
    if (estado === 'CANCELADO' || estado === 'INCIDENCIA') return false;
    if (estado === 'DISPONIBLE_RETIRO') return this.etapas.indexOf(etapa) <= 3;
    return this.etapas.indexOf(etapa) <= this.etapas.indexOf(estado);
  }
}
