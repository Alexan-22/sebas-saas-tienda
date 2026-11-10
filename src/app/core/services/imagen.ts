import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImagenService {
  private readonly apiUrl = `${environment.apiUrl}/api/imagenes`;

  constructor(
    private http: HttpClient
  ) {}

  subirProducto(archivo: File): Observable<string> {
    const formData = new FormData();

    formData.append('imagen', archivo);

    return this.http.post(
      `${this.apiUrl}/producto`,
      formData,
      {
        responseType: 'text'
      }
    );
  }
}