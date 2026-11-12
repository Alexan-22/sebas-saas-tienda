import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';

import { SeguimientoPedido } from '../detalle-compra/seguimiento-pedido';

@Component({
  selector: 'app-seguimiento-page',
  standalone: true,
  imports: [
    RouterLink,
    PromoBar,
    Navbar,
    Footer,
    SeguimientoPedido
  ],
  templateUrl: './seguimiento-page.html',
  styleUrl: './seguimiento-page.css'
})
export class SeguimientoPage {
  private readonly route = inject(ActivatedRoute);

  readonly idPedido = Number(
    this.route.snapshot.paramMap.get('id')
  );
}