import { Component } from '@angular/core';
import { GestionEnvios } from './gestion-envios/gestion-envios';

@Component({
  selector: 'app-envios',
  standalone: true,
  imports: [GestionEnvios],
  templateUrl: './envios.html',
  styleUrl: './envios.css'
})
export class Envios {}
