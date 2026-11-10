import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagoRequestDTO, PagoResponseDTO } from '../models/pago.model';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1/pagos`; // Ajusta según tu ruta en Spring Boot

  crearPreferenciaPago(request: PagoRequestDTO): Observable<PagoResponseDTO> {
    return this.http.post<PagoResponseDTO>(`${this.apiUrl}/crear-preferencia`, request);
  }
}