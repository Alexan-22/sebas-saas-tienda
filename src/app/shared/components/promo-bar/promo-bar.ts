import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CabeceraTiendaService, intervaloPromo, duracionDesplazamiento, textoContraste } from '../../../core/services/cabecera-tienda.service';
import { TiendaService } from '../../../core/services/tienda.service';

@Component({ selector: 'app-promo-bar', standalone: true, imports: [],
  templateUrl: './promo-bar.html', styleUrl: './promo-bar.css' })
export class PromoBar implements OnInit {
  readonly cabeceraService = inject(CabeceraTiendaService);
  readonly tiendaService = inject(TiendaService);
  readonly configuracion = this.cabeceraService.cabecera;
  readonly indice = signal(0);
  readonly color = computed(() => this.tiendaService.tiendaActual()?.colorPrimario || '#171717');
  readonly colorTexto = computed(() => textoContraste(this.color()));
  readonly mensaje = computed(() => {
    const textos = this.configuracion().promoMensajes;
    return textos.length ? textos[this.indice() % textos.length] : '';
  });
  readonly duracion = computed(() => duracionDesplazamiento(this.configuracion().promoVelocidad));
  readonly textoContinuo = computed(() => this.configuracion().promoMensajes.join('　 ✦　 '));
  readonly movimiento = computed(() => this.configuracion().promoVelocidad !== 'ESTATICA');
  readonly modoDesplazamiento = computed(() => this.configuracion().promoModo === 'DESPLAZAMIENTO');

  constructor() {
    effect(onCleanup => {
      const config = this.configuracion();
      const ms = intervaloPromo(config.promoVelocidad);
      if (!config.promoActiva || config.promoModo !== 'ROTACION' || ms === 0 || config.promoMensajes.length < 2) return;
      const timer = setInterval(() => {
        this.indice.update(i => (i + 1) % config.promoMensajes.length);
      }, ms);
      onCleanup(() => clearInterval(timer));
    });
  }

  ngOnInit(): void { this.cabeceraService.asegurarCarga(); }
}
