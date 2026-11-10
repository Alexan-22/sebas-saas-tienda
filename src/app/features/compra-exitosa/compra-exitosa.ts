import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CompraResponse } from '../../core/models/venta';
import { DatosCheckout } from '../../core/models/checkout';
import { Navbar } from '../../shared/components/navbar/navbar';
import { PromoBar } from '../../shared/components/promo-bar/promo-bar';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-compra-exitosa',
  standalone: true,
  imports: [DecimalPipe, RouterLink, Navbar, PromoBar, Footer],
  templateUrl: './compra-exitosa.html',
  styleUrl: './compra-exitosa.css'
})
export class CompraExitosa {
  compra: CompraResponse | null = null;
  cliente: DatosCheckout | null = null;

  constructor(
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state;

    this.compra = state?.['compra'] ?? null;
    this.cliente = state?.['cliente'] ?? null;
  }
}