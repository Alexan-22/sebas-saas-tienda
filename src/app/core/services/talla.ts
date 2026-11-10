import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Talla } from '../models/producto-talla';

@Injectable({
  providedIn: 'root'
})
export class TallaService {
  private readonly apiUrl = `${environment.apiUrl}/api/tallas`;

  constructor(
    private http: HttpClient
  ) {}

  // =========================================================
  // LISTAR TODAS LAS TALLAS
  // =========================================================
  listar(): Observable<Talla[]> {
    return this.http.get<Talla[]>(this.apiUrl);
  }

  // =========================================================
  // BUSCAR TALLA POR ID
  // =========================================================
  buscarPorId(idTalla: number): Observable<Talla> {
    return this.http.get<Talla>(
      `${this.apiUrl}/${idTalla}`
    );
  }
}