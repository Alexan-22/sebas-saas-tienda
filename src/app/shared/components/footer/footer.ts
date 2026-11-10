import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiendaService } from '../../../core/services/tienda.service';

@Component({selector:'app-footer',standalone:true,imports:[RouterLink],templateUrl:'./footer.html',styleUrl:'./footer.css'})
export class Footer {
  readonly anio = new Date().getFullYear();
  constructor(public readonly tiendaService: TiendaService) {}
}
