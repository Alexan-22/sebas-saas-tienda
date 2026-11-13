import { Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiendaService } from '../../../core/services/tienda.service';
import { FooterConfig, FooterTiendaService } from '../../../core/services/footer-tienda.service';

@Component({
  selector: 'app-footer', standalone: true, imports: [RouterLink],
  templateUrl: './footer.html', styleUrl: './footer.css'
})
export class Footer implements OnInit {
  readonly anio = new Date().getFullYear();
  readonly tiendaService = inject(TiendaService);
  readonly footerService = inject(FooterTiendaService);
  readonly vistaPrevia = input<FooterConfig>();
  readonly config = computed(() => this.vistaPrevia() ?? this.footerService.configuracion());
  readonly color = this.tiendaService.colorPrimario;
  readonly nombre = computed(() => this.tiendaService.tiendaActual()?.nombre || 'Nuestra tienda');
  ngOnInit(): void {
    if (!this.vistaPrevia()) this.footerService.cargarPublico();
  }
}
