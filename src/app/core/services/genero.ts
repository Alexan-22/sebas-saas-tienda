import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Genero } from '../models/producto';

@Injectable({
  providedIn: 'root'
})
export class GeneroService {
  private readonly apiUrl = `${environment.apiUrl}/api/generos`;

  constructor(
    private http: HttpClient
  ) {}

  listar(): Observable<Genero[]> {
    return this.http.get<Genero[]>(this.apiUrl);
  }
}