import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiendaService } from '../../../core/services/tienda.service';
import { FooterTiendaService } from '../../../core/services/footer-tienda.service';

@Component({
  selector: 'app-footer', standalone: true, imports: [RouterLink],
  templateUrl: './footer.html', styleUrl: './footer.css'
})
export class Footer implements OnInit {
  readonly anio = new Date().getFullYear();
  readonly tiendaService = inject(TiendaService);
  readonly footerService = inject(FooterTiendaService);
  readonly config = this.footerService.configuracion;
  readonly color = computed(() => this.tiendaService.tiendaActual()?.colorPrimario || '#171717');
  readonly nombre = computed(() => this.tiendaService.tiendaActual()?.nombre || 'Nuestra tienda');
  ngOnInit(): void { this.footerService.cargarPublico(); }
}
